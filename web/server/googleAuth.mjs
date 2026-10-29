import cors from 'cors'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { resolve } from 'node:path'
import 'dotenv/config'
import express from 'express'
import { OAuth2Client } from 'google-auth-library'
import { MongoClient, ObjectId } from 'mongodb'
import { fileURLToPath } from 'node:url'
import webpush from 'web-push'

const clientId = process.env.GOOGLE_CLIENT_ID ?? process.env.VITE_GOOGLE_CLIENT_ID
const clientSecret = process.env.GOOGLE_CLIENT_SECRET
const mongoUri = process.env.MONGODB_URI

if (!clientId || !clientSecret || !mongoUri) {
  console.error(
    'Missing Google OAuth or MongoDB environment variables. See .env.example.',
  )
  process.exit(1)
}

const oauth = new OAuth2Client(clientId, clientSecret, 'postmessage')
const mongoClient = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 })
const app = express()
const port = Number(process.env.PORT ?? process.env.AUTH_SERVER_PORT ?? 3001)
const webRoot = fileURLToPath(new URL('..', import.meta.url))
const distPath = resolve(webRoot, 'dist')
const sessionCookie = 'may5_session'
const sessionDurationMs = 30 * 24 * 60 * 60 * 1000
let users
let sessions
let bookings
let paymentOrders
let vendorServices
let vendorStaff
let vendorBranches
let supportReports
let pushSubscriptions
let customerNotifications
let vendorContent
let pushConfiguration
let databaseAvailable = false

const emptyBusinessProfile = {
  businessName: '',
  businessType: '',
  description: '',
  address: '',
  locality: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  email: '',
  website: '',
  openingHours: '',
  targetAudience: 'unisex',
  openingTime: '',
  closingTime: '',
  shopPhoto: '',
}

const defaultVendorPreferences = {
  booking: {
    acceptInstantBooking: true,
    requiresApproval: false,
    advanceBookingRequired: false,
    numberOfSlots: 1,
    cancellationPolicy: '',
  },
  customerManagement: {
    enableCustomerHistory: true,
    enableAppointmentReminders: true,
    enablePromotionalMessages: false,
    reminderIntervalHours: 2,
    customReminderHours: 2,
  },
}

const providerSubscriptionPlans = [
  { id: 'monthly', name: '1 month', durationMonths: 1, priceRupees: 199, originalPriceRupees: 199, discountPercent: 0 },
  { id: 'quarterly', name: '3 months', durationMonths: 3, priceRupees: 499, originalPriceRupees: 597, discountPercent: 16 },
  { id: 'half-yearly', name: '6 months', durationMonths: 6, priceRupees: 899, originalPriceRupees: 1194, discountPercent: 25 },
  { id: 'yearly', name: '12 months', durationMonths: 12, priceRupees: 1599, originalPriceRupees: 2388, discountPercent: 33 },
]

const providerSubscriptionPlansById = new Map(
  providerSubscriptionPlans.map((plan) => [plan.id, plan]),
)

function toBusinessProfile(user) {
  return {
    ...Object.fromEntries(
      [
        ['id', user.businessId ?? ''],
        ...Object.keys(emptyBusinessProfile).map((key) => [key, user[key] ?? '']),
      ],
    ),
    openingDays: Array.isArray(user.openingDays) ? user.openingDays : [],
    amenities: Array.isArray(user.amenities) ? user.amenities : [],
    lat: Number.isFinite(user.lat) ? user.lat : null,
    lng: Number.isFinite(user.lng) ? user.lng : null,
  }
}

app.use(cors({ origin: true }))
app.post('/api/vendor/services', express.json({ limit: '36mb' }))
app.use(express.json({
  limit: '8mb',
  verify: (req, _res, body) => {
    req.rawBody = Buffer.from(body)
  },
}))
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && req.path !== '/api/health' && !databaseAvailable) {
    res.status(503).json({
      ok: false,
      error: 'Database unavailable. The server is running without MongoDB connectivity.',
    })
    return
  }
  next()
})

function readSessionToken(req) {
  const cookie = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookie}=`))

  return cookie?.slice(sessionCookie.length + 1)
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

async function razorpayRequest(path, options = {}) {
  const testMode = options.testMode === true
  const { testMode: _testMode, ...requestOptions } = options
  const keyId = process.env[testMode ? 'RAZORPAY_TEST_KEY_ID' : 'RAZORPAY_KEY_ID']
  const keySecret = process.env[testMode ? 'RAZORPAY_TEST_KEY_SECRET' : 'RAZORPAY_KEY_SECRET']
  if (keyId && (testMode ? !keyId.startsWith('rzp_test_') : keyId.startsWith('rzp_test_'))) {
    const err = new Error(testMode
      ? 'Demo checkout requires a Razorpay test key ID beginning with rzp_test_.'
      : 'Live checkout is configured with a test key ID; use the matching live key ID and secret.')
    err.status = 503
    throw err
  }
  if (!keyId || !keySecret) {
    const err = new Error(testMode
      ? 'Demo checkout requires Razorpay test keys. Add RAZORPAY_TEST_KEY_ID and RAZORPAY_TEST_KEY_SECRET in Render.'
      : 'Online payments are not configured')
    err.status = 503
    throw err
  }

  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...requestOptions,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const err = new Error(result.error?.description ?? 'Payment provider request failed')
    err.status = response.status === 429 ? 503 : 502
    throw err
  }
  return result
}

const demoSalonNames = new Map([
  ['salon-1', 'Glamour Wave Salon'],
  ['salon-2', 'Elegance Salon'],
  ['salon-3', 'Urban Glow Studio'],
  ['salon-4', 'Blush & Bloom Beauty Parlour'],
  ['salon-5', 'Crown & Comb Hair Studio'],
  ['salon-6', 'Petal Spa & Wellness'],
  ['salon-7', 'NailNest Studio'],
  ['salon-8', 'Mirror & Muse Beauty Lounge'],
  ['salon-9', 'The Modern Barber & Grooming Co.'],
])

const demoServices = new Map([
  ['svc-1', { salonId: 'salon-2', name: "Women's Haircut", price: 650 }],
  ['svc-2', { salonId: 'salon-2', name: 'Balayage Color', price: 1800 }],
  ['svc-3', { salonId: 'salon-2', name: 'At-home Blowout', price: 850 }],
  ['svc-4', { salonId: 'salon-1', name: 'Blowout', price: 790 }],
  ['svc-5', { salonId: 'salon-3', name: 'Signature facial', price: 1200 }],
  ['svc-6', { salonId: 'salon-3', name: 'Bridal makeup', price: 6500 }],
  ['svc-7', { salonId: 'salon-4', name: 'Everyday makeup', price: 1800 }],
  ['svc-8', { salonId: 'salon-4', name: 'Threading and brow shaping', price: 350 }],
  ['svc-9', { salonId: 'salon-5', name: 'Men’s haircut and styling', price: 700 }],
  ['svc-10', { salonId: 'salon-5', name: 'Hair spa and conditioning', price: 1400 }],
  ['svc-11', { salonId: 'salon-6', name: 'Relaxing full-body massage', price: 2200 }],
  ['svc-12', { salonId: 'salon-6', name: 'Aromatherapy treatment', price: 2800 }],
  ['svc-13', { salonId: 'salon-7', name: 'Gel manicure', price: 950 }],
  ['svc-14', { salonId: 'salon-7', name: 'Classic pedicure', price: 1100 }],
  ['svc-15', { salonId: 'salon-8', name: 'Saree draping and party makeup', price: 3200 }],
  ['svc-16', { salonId: 'salon-8', name: 'Hair styling', price: 900 }],
  ['svc-17', { salonId: 'salon-1', name: 'Precision haircut', price: 950 }],
  ['svc-18', { salonId: 'salon-2', name: 'Hair spa and repair treatment', price: 1600 }],
  ['svc-19', { salonId: 'salon-3', name: 'Glow facial', price: 1450 }],
  ['svc-20', { salonId: 'salon-4', name: 'Bridal makeup trial', price: 2500 }],
  ['svc-21', { salonId: 'salon-5', name: 'Beard trim and shaping', price: 400 }],
  ['svc-22', { salonId: 'salon-6', name: 'Deep tissue massage', price: 2600 }],
  ['svc-23', { salonId: 'salon-7', name: 'Nail art add-on', price: 500 }],
  ['svc-24', { salonId: 'salon-8', name: 'Party makeup', price: 2800 }],
  ['svc-25', { salonId: 'salon-9', name: 'Fade haircut and finish', price: 650 }],
  ['svc-26', { salonId: 'salon-9', name: 'Hot towel shave', price: 450 }],
  ['svc-27', { salonId: 'salon-9', name: 'Beard sculpt and line-up', price: 550 }],
  ['svc-28', { salonId: 'salon-9', name: 'Head shave and scalp care', price: 700 }],
  ['svc-29', { salonId: 'salon-5', name: 'Men’s haircut and beard combo', price: 1100 }],
  ['svc-30', { salonId: 'salon-6', name: 'Swedish relaxation massage', price: 2400 }],
  ['svc-31', { salonId: 'salon-6', name: 'Hot stone therapy', price: 3200 }],
  ['svc-32', { salonId: 'salon-6', name: 'Body scrub and polish', price: 1900 }],
  ['svc-33', { salonId: 'salon-4', name: 'Full arms and legs waxing', price: 1600 }],
  ['svc-34', { salonId: 'salon-8', name: 'Eyebrow threading and tint', price: 650 }],
  ['svc-35', { salonId: 'salon-3', name: 'Hydrating skin treatment', price: 2100 }],
  ['svc-36', { salonId: 'salon-4', name: 'Manicure and pedicure combo', price: 1500 }],
])

const demoServiceTemplates = [...demoServices.entries()]
for (const salonId of demoSalonNames.keys()) {
  for (const [serviceId, service] of demoServiceTemplates) {
    if (service.salonId !== salonId) {
      demoServices.set(`demo-${salonId}-${serviceId}`, { ...service, salonId })
    }
  }
}

async function recordCapturedPayment(order, payment) {
  const existingBooking = await bookings.findOne({
    paymentOrderId: order.razorpayOrderId,
    customerId: order.userId,
  })
  if (existingBooking) {
    await paymentOrders.updateOne(
      { _id: order._id },
      { $set: { status: 'paid', paymentId: payment.id, bookingId: existingBooking._id, paidAt: new Date() } },
    )
    return { ...existingBooking, id: existingBooking._id.toString() }
  }

  const booking = {
    salonId: order.salonId,
    serviceId: order.serviceId,
    ...(order.staffId ? { staffId: order.staffId } : {}),
    customerId: order.userId,
    status: order.requiresApproval ? 'pending' : 'scheduled',
    scheduledAt: order.scheduledAt,
    paymentMode: 'online',
    paymentStatus: 'paid',
    paymentId: payment.id,
    paymentOrderId: order.razorpayOrderId,
    amountPaid: order.amount,
    ...(order.isDemo ? { demoListing: true } : {}),
    mediaAuthorized: false,
    mediaUrls: [],
    createdAt: new Date(),
  }
  let inserted
  try {
    inserted = await bookings.insertOne(booking)
  } catch (err) {
    if (err.code !== 11000) throw err
    const duplicate = await bookings.findOne({
      paymentOrderId: order.razorpayOrderId,
      customerId: order.userId,
    })
    if (!duplicate) throw err
    await paymentOrders.updateOne(
      { _id: order._id },
      { $set: { status: 'paid', paymentId: payment.id, bookingId: duplicate._id, paidAt: new Date() } },
    )
    return { ...duplicate, id: duplicate._id.toString() }
  }
  await paymentOrders.updateOne(
    { _id: order._id },
    { $set: { status: 'paid', paymentId: payment.id, bookingId: inserted.insertedId, paidAt: new Date() } },
  )

  const user = await users.findOne({ googleId: order.userId })
  if (user) {
    try {
      await createCustomerNotification(
        user,
        'booking_confirmation',
        booking.status === 'pending' ? 'Booking request paid' : 'Booking confirmed',
        booking.status === 'pending'
          ? `Your paid appointment request for ${new Date(booking.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} is awaiting business approval.`
          : `Your paid appointment is scheduled for ${new Date(booking.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.`,
        '/customer/bookings',
      )
    } catch (err) {
      console.error('Payment succeeded, but booking confirmation notification failed:', err)
    }
  }
  return { ...booking, id: inserted.insertedId.toString() }
}

async function recordCapturedProviderSubscription(order, payment) {
  const plan = providerSubscriptionPlansById.get(order.planId)
  if (!plan || order.amount !== plan.priceRupees * 100 || order.currency !== 'INR') {
    throw new Error('Provider subscription order does not match an available plan')
  }

  const startsAt = {
    $cond: [
      { $gt: ['$vendorSubscription.expiresAt', '$$NOW'] },
      '$vendorSubscription.expiresAt',
      '$$NOW',
    ],
  }
  const updatedUser = await users.findOneAndUpdate(
    {
      googleId: order.userId,
      role: 'vendor',
      'vendorSubscription.lastAppliedOrderId': { $ne: order.razorpayOrderId },
    },
    [{
      $set: {
        vendorSubscription: {
          planId: { $literal: plan.id },
          status: { $literal: 'active' },
          startsAt,
          expiresAt: { $dateAdd: { startDate: startsAt, unit: 'month', amount: plan.durationMonths } },
          lastAppliedOrderId: { $literal: order.razorpayOrderId },
          paymentId: { $literal: payment.id },
          amount: { $literal: order.amount },
        },
        updatedAt: '$$NOW',
      },
    }],
    { returnDocument: 'after' },
  )

  let user = updatedUser
  if (!user) {
    user = await users.findOne({ googleId: order.userId, role: 'vendor' })
    if (user?.vendorSubscription?.lastAppliedOrderId !== order.razorpayOrderId) {
      throw new Error('Provider account was not found for the paid subscription')
    }
  }

  await paymentOrders.updateOne(
    { _id: order._id },
    { $set: { status: 'paid', paymentId: payment.id, paidAt: new Date() } },
  )
  return getProviderSubscription(user)
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${sessionCookie}=${token}; HttpOnly; SameSite=Lax; Path=/api; Max-Age=${sessionDurationMs / 1000}${secure}`,
  )
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${sessionCookie}=; HttpOnly; SameSite=Lax; Path=/api; Max-Age=0${secure}`,
  )
}

async function authenticatedUser(req) {
  const token = readSessionToken(req)
  if (!token) return null

  const session = await sessions.findOne({
    _id: hashToken(token),
    expiresAt: { $gt: new Date() },
  })
  if (!session) return null

  return users.findOne({ googleId: session.userId })
}

function getProviderSubscription(user) {
  const subscription = user.vendorSubscription
  if (
    !subscription ||
    subscription.status !== 'active' ||
    !(subscription.startsAt instanceof Date) ||
    !(subscription.expiresAt instanceof Date) ||
    subscription.expiresAt <= new Date()
  ) {
    return null
  }
  return {
    planId: subscription.planId,
    status: 'active',
    startsAt: subscription.startsAt.toISOString(),
    expiresAt: subscription.expiresAt.toISOString(),
  }
}

app.use('/api/vendor', async (req, res, next) => {
  if (['/profile', '/subscription', '/subscription/order'].includes(req.path)) {
    next()
    return
  }
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }
    if (!getProviderSubscription(user)) {
      res.status(402).json({ error: 'An active MAY5 provider subscription is required to use business features' })
      return
    }
    next()
  } catch (err) {
    console.error('Could not verify provider subscription access:', err)
    res.status(500).json({ error: 'Could not verify provider subscription' })
  }
})

function toUserProfile(user) {
  return {
    id: user.googleId,
    email: user.email ?? '',
    fullName: user.fullName ?? user.email ?? 'Google user',
    avatarUrl: user.avatarUrl ?? '',
    phone: user.phone ?? '',
    age: user.age,
    gender: user.gender,
    role: user.role ?? 'customer',
    authProvider: user.authProvider ?? 'google',
  }
}

async function createUserSession(user, res) {
  const token = randomBytes(32).toString('hex')
  await sessions.insertOne({
    _id: hashToken(token),
    userId: user.googleId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + sessionDurationMs),
  })
  setSessionCookie(res, token)
  res.json(toUserProfile(user))
}

app.post('/api/auth/demo-otp', async (req, res) => {
  const { phone, code, fullName } = req.body ?? {}
  const normalizedName = typeof fullName === 'string' ? fullName.trim() : ''
  const digits = typeof phone === 'string' ? phone.replace(/\D/g, '') : ''
  const nationalNumber = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits

  if (!/^[6-9]\d{9}$/.test(nationalNumber) || code !== '123456') {
    res.status(401).json({ error: 'Invalid Indian mobile number or demo OTP' })
    return
  }
  const duplicateBooking = await bookings.findOne({ paymentOrderId: orderId, customerId: user.googleId })
  if (duplicateBooking) {
    await paymentOrders.updateOne(
      { _id: order._id },
      { $set: { status: 'paid', paymentId, bookingId: duplicateBooking._id, paidAt: new Date() } },
    )
    res.json({ ...duplicateBooking, id: duplicateBooking._id.toString() })
    return
  }
  if (!normalizedName || normalizedName.length > 80) {
    res.status(400).json({ error: 'Enter a name of 1 to 80 characters' })
    return
  }

  const normalizedPhone = `+91${nationalNumber}`
  const userId = `phone:${nationalNumber}`
  try {
    const user = await users.findOneAndUpdate(
      { googleId: userId },
      {
        $set: {
          phone: normalizedPhone,
          fullName: normalizedName,
          authProvider: 'demo',
          updatedAt: new Date(),
        },
        $setOnInsert: {
          email: '',
          role: 'customer',
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' },
    )
    if (!user) throw new Error('Demo account upsert returned no user')
    await createUserSession(user, res)
  } catch (err) {
    console.error('Could not create demo OTP session:', err)
    res.status(500).json({ error: 'Could not sign in with demo OTP' })
  }
})

app.post('/api/auth/google', async (req, res) => {
  const code = req.body?.code
  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Missing authorization code' })
    return
  }

  let googleUser
  try {
    const { tokens } = await oauth.getToken({ code, redirect_uri: 'postmessage' })
    if (!tokens.id_token) {
      res.status(401).json({ error: 'No ID token returned from Google' })
      return
    }

    const ticket = await oauth.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    })
    const payload = ticket.getPayload()
    if (!payload?.sub) {
      res.status(401).json({ error: 'Invalid token payload' })
      return
    }

    googleUser = {
      googleId: payload.sub,
      email: payload.email ?? '',
      fullName: payload.name ?? payload.email?.split('@')[0] ?? 'Google user',
      avatarUrl: payload.picture ?? '',
    }
  } catch (err) {
    console.error('Google token exchange failed:', err)
    res.status(401).json({ error: 'Google sign-in failed' })
    return
  }

  let user
  try {
    user = await users.findOneAndUpdate(
      { googleId: googleUser.googleId },
      {
        $set: {
          email: googleUser.email,
          fullName: googleUser.fullName,
          avatarUrl: googleUser.avatarUrl,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          authProvider: 'google',
          role: 'customer',
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' },
    )
    if (!user) throw new Error('Google profile upsert returned no user')
  } catch (err) {
    console.error('Google profile persistence failed:', err)
    res.status(500).json({ error: 'Could not save Google profile' })
    return
  }

  try {
    await createUserSession(user, res)
  } catch (err) {
    console.error('Could not create user session:', err)
    res.status(500).json({ error: 'Could not start user session' })
  }
})

app.get('/api/auth/session', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      clearSessionCookie(res)
      res.status(401).json({ error: 'No active session' })
      return
    }
    res.json(toUserProfile(user))
  } catch (err) {
    console.error('Could not load user session:', err)
    res.status(500).json({ error: 'Could not load user session' })
  }
})

app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = readSessionToken(req)
    if (token) await sessions.deleteOne({ _id: hashToken(token) })
    clearSessionCookie(res)
    res.status(204).end()
  } catch (err) {
    console.error('Could not end user session:', err)
    res.status(500).json({ error: 'Could not end user session' })
  }
})

app.patch('/api/profile', async (req, res) => {
  let user
  try {
    user = await authenticatedUser(req)
  } catch (err) {
    console.error('Could not authenticate profile update:', err)
    res.status(500).json({ error: 'Could not update profile' })
    return
  }
  if (!user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const { fullName, phone, age, gender, avatarUrl, role } = req.body ?? {}
  const fields = {}
  if (fullName !== undefined) {
    if (typeof fullName !== 'string' || !fullName.trim() || fullName.length > 120) {
      res.status(400).json({ error: 'Name must be between 1 and 120 characters' })
      return
    }
    fields.fullName = fullName.trim()
  }
  if (phone !== undefined) {
    if (typeof phone !== 'string') {
      res.status(400).json({ error: 'Enter a valid Indian mobile number' })
      return
    }
    const digits = phone.replace(/\D/g, '')
    const mobile = digits.length === 12 && digits.startsWith('91')
      ? digits.slice(2)
      : digits
    if (phone && !/^[6-9]\d{9}$/.test(mobile)) {
      res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number' })
      return
    }
    fields.phone = phone ? `+91${mobile}` : ''
  }
  if (age !== undefined) {
    if (age !== null && (!Number.isInteger(age) || age < 13 || age > 120)) {
      res.status(400).json({ error: 'Age must be between 13 and 120' })
      return
    }
    fields.age = age
  }
  if (gender !== undefined) {
    if (gender !== null && !['female', 'male', 'non_binary'].includes(gender)) {
      res.status(400).json({ error: 'Invalid gender value' })
      return
    }
    fields.gender = gender
  }
  if (avatarUrl !== undefined) {
    if (
      avatarUrl !== null &&
      (
        typeof avatarUrl !== 'string' ||
        avatarUrl.length > 2_800_000 ||
        (!/^https?:\/\//i.test(avatarUrl) && !/^data:image\/(?:jpeg|png|webp);base64,[a-z\d+/]+=*$/i.test(avatarUrl))
      )
    ) {
      res.status(400).json({ error: 'Avatar must be a supported image or HTTP(S) URL' })
      return
    }
    fields.avatarUrl = avatarUrl
  }
  if (role !== undefined) {
    if (!['customer', 'vendor', 'admin'].includes(role)) {
      res.status(400).json({ error: 'Invalid user role' })
      return
    }
    if (role === 'admin' && user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access must be granted by an administrator' })
      return
    }
    fields.role = role
  }

  try {
    const updated = await users.findOneAndUpdate(
      { googleId: user.googleId },
      { $set: { ...fields, updatedAt: new Date() } },
      { returnDocument: 'after' },
    )
    res.json(toUserProfile(updated))
  } catch (err) {
    console.error('MongoDB profile update failed:', err)
    res.status(500).json({ error: 'Could not update profile' })
  }
})

const defaultCustomerSettings = {
  addresses: [],
  notifications: {
    bookingConfirmations: true,
    appointmentReminders: true,
    bookingStatusUpdates: true,
    offersAndPromotions: true,
  },
  bookingPreferences: {
    serviceLocation: 'salon',
    preferredTime: '',
  },
  groomingPreferences: {
    hairType: '',
    skinType: '',
    allergies: '',
    notes: '',
  },
}

function notificationEnabled(user, type) {
  const key = {
    booking_confirmation: 'bookingConfirmations',
    appointment_reminder: 'appointmentReminders',
    booking_update: 'bookingStatusUpdates',
    offer: 'offersAndPromotions',
  }[type]
  return key ? user.customerSettings?.notifications?.[key] !== false : false
}

async function sendPushToCustomer(userId, title, body, url) {
  if (!pushConfiguration) return { delivered: 0, failed: 0 }
  const records = await pushSubscriptions.find({ userId }).toArray()
  const outcomes = await Promise.all(records.map(async (record) => {
    try {
      await webpush.sendNotification(
        record.subscription,
        JSON.stringify({ title, body, url }),
        { TTL: 86400 },
      )
      return 'delivered'
    } catch (err) {
      const statusCode = err?.statusCode
      if (statusCode === 404 || statusCode === 410) {
        await pushSubscriptions.deleteOne({ _id: record._id })
        return 'expired'
      }
      console.error('Could not deliver MAY5 push notification:', err)
      return 'failed'
    }
  }))
  return {
    delivered: outcomes.filter((outcome) => outcome === 'delivered').length,
    failed: outcomes.filter((outcome) => outcome === 'failed').length,
  }
}

async function createCustomerNotification(user, type, title, body, url = '/customer/profile/notifications') {
  try {
    const result = await customerNotifications.insertOne({
      userId: user.googleId,
      type,
      title,
      body,
      url,
      createdAt: new Date(),
      read: false,
    })
    if (notificationEnabled(user, type)) {
      await sendPushToCustomer(user.googleId, title, body, url)
    }
    return result.insertedId
  } catch (err) {
    console.error('Could not create MAY5 customer notification:', err)
    return null
  }
}

app.get('/api/customer/settings', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    res.json({
      ...defaultCustomerSettings,
      ...(user.customerSettings ?? {}),
      notifications: {
        ...defaultCustomerSettings.notifications,
        ...(user.customerSettings?.notifications ?? {}),
      },
      bookingPreferences: {
        ...defaultCustomerSettings.bookingPreferences,
        ...(user.customerSettings?.bookingPreferences ?? {}),
      },
      groomingPreferences: {
        ...defaultCustomerSettings.groomingPreferences,
        ...(user.customerSettings?.groomingPreferences ?? {}),
      },
    })
  } catch (err) {
    console.error('Could not load customer settings:', err)
    res.status(500).json({ error: 'Could not load customer settings' })
  }
})

app.get('/api/customer/notifications', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    const records = await customerNotifications
      .find({ userId: user.googleId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()
    res.json(records.map(({ _id, userId: _userId, url: _url, ...notification }) => ({
      ...notification,
      id: _id.toString(),
      createdAt: notification.createdAt.toISOString(),
    })))
  } catch (err) {
    console.error('Could not load customer notifications:', err)
    res.status(500).json({ error: 'Could not load notifications' })
  }
})

app.get('/api/push/public-key', async (_req, res) => {
  if (!pushConfiguration) {
    res.status(503).json({ error: 'Push notifications are not configured' })
    return
  }
  res.json({ publicKey: pushConfiguration.publicKey })
})

app.post('/api/push/test', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if ((user.role ?? 'customer') !== 'customer') {
      res.status(403).json({ error: 'Customer account required' })
      return
    }
    if (!pushConfiguration) {
      res.status(503).json({ error: 'Push notifications are not configured' })
      return
    }
    const subscriptions = await pushSubscriptions.find({ userId: user.googleId }).limit(10).toArray()
    if (!subscriptions.length) {
      res.status(409).json({ error: 'Enable browser notifications on this device first' })
      return
    }
    const result = await sendPushToCustomer(
      user.googleId,
      'MAY5 notifications are on',
      'You’ll receive booking confirmations and appointment reminders here.',
      '/customer/profile/notifications',
    )
    if (result.delivered === 0) {
      res.status(502).json({ error: 'The test push could not be delivered. Check this browser’s subscription and try again.' })
      return
    }
    res.status(204).end()
  } catch (err) {
    console.error('Could not send test browser push:', err)
    res.status(500).json({ error: 'Could not send a test notification' })
  }
})

app.post('/api/push/subscriptions', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if ((user.role ?? 'customer') !== 'customer') {
      res.status(403).json({ error: 'Customer account required' })
      return
    }
    const subscription = req.body ?? {}
    if (
      typeof subscription.endpoint !== 'string' ||
      subscription.endpoint.length > 2048 ||
      !/^https:\/\//i.test(subscription.endpoint) ||
      typeof subscription.keys?.p256dh !== 'string' ||
      subscription.keys.p256dh.length > 256 ||
      typeof subscription.keys?.auth !== 'string' ||
      subscription.keys.auth.length > 256
    ) {
      res.status(400).json({ error: 'Invalid browser push subscription' })
      return
    }
    const existingSubscription = await pushSubscriptions.findOne({ endpoint: subscription.endpoint })
    if (!existingSubscription) {
      const subscriptionCount = await pushSubscriptions.countDocuments({ userId: user.googleId })
      if (subscriptionCount >= 10) {
        res.status(409).json({ error: 'This account already has the maximum number of notification devices' })
        return
      }
    }
    await pushSubscriptions.updateOne(
      { endpoint: subscription.endpoint },
      { $set: { userId: user.googleId, endpoint: subscription.endpoint, subscription, updatedAt: new Date() } },
      { upsert: true },
    )
    res.status(204).end()
  } catch (err) {
    console.error('Could not save browser push subscription:', err)
    res.status(500).json({ error: 'Could not enable push notifications' })
  }
})

app.delete('/api/push/subscriptions', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    const { endpoint } = req.body ?? {}
    if (typeof endpoint !== 'string' || endpoint.length > 2048) {
      res.status(400).json({ error: 'Invalid browser push endpoint' })
      return
    }
    await pushSubscriptions.deleteOne({ userId: user.googleId, endpoint })
    res.status(204).end()
  } catch (err) {
    console.error('Could not remove browser push subscription:', err)
    res.status(500).json({ error: 'Could not disable push notifications' })
  }
})

app.patch('/api/customer/settings', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    const { addresses, notifications, bookingPreferences, groomingPreferences } = req.body ?? {}
    if (
      !Array.isArray(addresses) ||
      addresses.length > 20 ||
      addresses.some((address) =>
        !address ||
        typeof address.id !== 'string' ||
        address.id.length > 80 ||
        typeof address.label !== 'string' ||
        !address.label.trim() ||
        address.label.length > 40 ||
        typeof address.address !== 'string' ||
        !address.address.trim() ||
        address.address.length > 300 ||
        typeof address.city !== 'string' ||
        !address.city.trim() ||
        address.city.length > 100 ||
        typeof address.pincode !== 'string' ||
        !/^\d{6}$/.test(address.pincode)
      )
    ) {
      res.status(400).json({ error: 'Check the saved addresses and try again' })
      return
    }
    const notificationKeys = Object.keys(defaultCustomerSettings.notifications)
    if (
      !notifications ||
      notificationKeys.some((key) => typeof notifications[key] !== 'boolean')
    ) {
      res.status(400).json({ error: 'Invalid notification preferences' })
      return
    }
    if (
      !bookingPreferences ||
      !['salon', 'home'].includes(bookingPreferences.serviceLocation) ||
      typeof bookingPreferences.preferredTime !== 'string' ||
      bookingPreferences.preferredTime.length > 80
    ) {
      res.status(400).json({ error: 'Invalid booking preferences' })
      return
    }
    const groomingKeys = Object.keys(defaultCustomerSettings.groomingPreferences)
    if (
      !groomingPreferences ||
      groomingKeys.some((key) =>
        typeof groomingPreferences[key] !== 'string' || groomingPreferences[key].length > 500
      )
    ) {
      res.status(400).json({ error: 'Invalid grooming preferences' })
      return
    }

    const customerSettings = { addresses, notifications, bookingPreferences, groomingPreferences }
    await users.updateOne(
      { googleId: user.googleId },
      { $set: { customerSettings, updatedAt: new Date() } },
    )
    res.json(customerSettings)
  } catch (err) {
    console.error('Could not save customer settings:', err)
    res.status(500).json({ error: 'Could not save customer settings' })
  }
})

app.post('/api/support/report', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    const { category, message } = req.body ?? {}
    if (
      typeof category !== 'string' ||
      !['booking', 'business', 'account', 'payment', 'other'].includes(category) ||
      typeof message !== 'string' ||
      message.trim().length < 10 ||
      message.length > 3000
    ) {
      res.status(400).json({ error: 'Choose a category and enter at least 10 characters' })
      return
    }
    await supportReports.insertOne({
      userId: user.googleId,
      category,
      message: message.trim(),
      createdAt: new Date(),
      status: 'open',
    })
    res.status(201).json({ ok: true })
  } catch (err) {
    console.error('Could not submit customer support report:', err)
    res.status(500).json({ error: 'Could not submit your report' })
  }
})

app.delete('/api/account', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'customer') {
      res.status(403).json({ error: 'Only customer accounts can be deleted here' })
      return
    }
    await Promise.all([
      sessions.deleteMany({ userId: user.googleId }),
      bookings.deleteMany({ customerId: user.googleId }),
      supportReports.deleteMany({ userId: user.googleId }),
      pushSubscriptions.deleteMany({ userId: user.googleId }),
      customerNotifications.deleteMany({ userId: user.googleId }),
    ])
    await users.deleteOne({ googleId: user.googleId })
    clearSessionCookie(res)
    res.status(204).end()
  } catch (err) {
    console.error('Could not delete customer account:', err)
    res.status(500).json({ error: 'Could not delete customer account' })
  }
})

app.get('/api/bookings', async (req, res) => {
  let user
  try {
    user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const records = await bookings
      .find({ customerId: user.googleId })
      .sort({ scheduledAt: -1 })
      .toArray()
    res.json(
      records.map(({ _id, ...booking }) => ({ ...booking, id: _id })),
    )
  } catch (err) {
    console.error('MongoDB booking lookup failed:', err)
    res.status(500).json({ error: 'Could not load bookings' })
  }
})

app.get('/api/favorites', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    res.json(user.favorites ?? [])
  } catch (err) {
    console.error('MongoDB favorites lookup failed:', err)
    res.status(500).json({ error: 'Could not load favorites' })
  }
})

app.patch('/api/favorites', async (req, res) => {
  let user
  try {
    user = await authenticatedUser(req)
  } catch (err) {
    console.error('Could not authenticate favorites update:', err)
    res.status(500).json({ error: 'Could not update favorites' })
    return
  }
  if (!user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const { salonId, favorite } = req.body ?? {}
  if (
    typeof salonId !== 'string' ||
    salonId.length === 0 ||
    salonId.length > 120 ||
    typeof favorite !== 'boolean'
  ) {
    res.status(400).json({ error: 'Invalid favorite details' })
    return
  }

  try {
    await users.updateOne(
      { googleId: user.googleId },
      favorite
        ? { $addToSet: { favorites: salonId } }
        : { $pull: { favorites: salonId } },
    )
    res.status(204).end()
  } catch (err) {
    console.error('MongoDB favorite update failed:', err)
    res.status(500).json({ error: 'Could not update favorite' })
  }
})

app.post('/api/payments/razorpay/order', async (req, res) => {
  res.status(410).json({
    error: 'MAY5 no longer accepts service payments during booking. Pay the service provider directly at the store.',
  })
})

app.post('/api/payments/razorpay/webhook', async (req, res) => {
  const payment = req.body?.payload?.payment?.entity
  let order
  if (typeof payment?.order_id === 'string') {
    try {
      order = await paymentOrders.findOne({ razorpayOrderId: payment.order_id })
    } catch (err) {
      console.error('Could not look up Razorpay webhook order:', err)
      res.status(500).json({ error: 'Could not verify payment webhook' })
      return
    }
  }
  const webhookSecret = process.env[
    order?.paymentEnvironment === 'test' ? 'RAZORPAY_TEST_WEBHOOK_SECRET' : 'RAZORPAY_WEBHOOK_SECRET'
  ]
  const signature = req.headers['x-razorpay-signature']
  if (!webhookSecret || typeof signature !== 'string' || !Buffer.isBuffer(req.rawBody)) {
    res.status(503).json({ error: 'Payment webhook verification is not configured' })
    return
  }
  const expected = createHmac('sha256', webhookSecret).update(req.rawBody).digest()
  const actual = /^[a-f0-9]{64}$/i.test(signature) ? Buffer.from(signature, 'hex') : Buffer.alloc(0)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    res.status(401).json({ error: 'Invalid payment webhook signature' })
    return
  }
  if (req.body?.event !== 'payment.captured') {
    res.status(200).json({ received: true })
    return
  }
  try {
    if (
      !payment ||
      typeof payment.order_id !== 'string' ||
      typeof payment.id !== 'string' ||
      !Number.isSafeInteger(payment.amount) ||
      payment.status !== 'captured'
    ) {
      res.status(400).json({ error: 'Invalid captured-payment event' })
      return
    }
    if (!order) {
      console.warn('Received a captured payment for an unknown Razorpay order.')
      res.status(200).json({ received: true })
      return
    }
    if (payment.amount !== order.amount || payment.currency !== order.currency) {
      res.status(400).json({ error: 'Captured payment does not match its order' })
      return
    }
    if (order.purpose === 'provider_subscription') {
      await recordCapturedProviderSubscription(order, payment)
    } else {
      await recordCapturedPayment(order, payment)
    }
    res.status(200).json({ received: true })
  } catch (err) {
    console.error('Could not process captured-payment webhook:', err)
    res.status(500).json({ error: 'Could not process captured payment' })
  }
})

app.post('/api/payments/razorpay/verify', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body ?? {}
    if (
      typeof orderId !== 'string' ||
      typeof paymentId !== 'string' ||
      typeof signature !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(signature)
    ) {
      res.status(400).json({ error: 'Invalid payment verification details' })
      return
    }
    const order = await paymentOrders.findOne({ razorpayOrderId: orderId, userId: user.googleId })
    if (!order) {
      res.status(404).json({ error: 'Payment order not found' })
      return
    }
    if (order.purpose !== 'provider_subscription' || user.role !== 'vendor') {
      res.status(410).json({ error: 'MAY5 no longer accepts service payments during booking' })
      return
    }
    if (order.status === 'paid') {
      const currentUser = await users.findOne({ googleId: user.googleId, role: 'vendor' })
      const subscription = currentUser && getProviderSubscription(currentUser)
      if (!subscription) {
        res.status(409).json({ error: 'Payment was received, but the provider subscription needs support assistance' })
        return
      }
      res.json(subscription)
      return
    }
    const testMode = order.paymentEnvironment === 'test'
    const keySecret = process.env[testMode ? 'RAZORPAY_TEST_KEY_SECRET' : 'RAZORPAY_KEY_SECRET']
    if (!keySecret) {
      res.status(503).json({
        error: testMode
          ? 'Demo checkout requires Razorpay test keys. Add RAZORPAY_TEST_KEY_ID and RAZORPAY_TEST_KEY_SECRET in Render.'
          : 'Online payments are not configured',
      })
      return
    }
    const expected = createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest()
    const actual = Buffer.from(signature, 'hex')
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      res.status(400).json({ error: 'Payment signature verification failed' })
      return
    }

    const payment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`, { testMode })
    if (
      payment.order_id !== orderId ||
      payment.status !== 'captured' ||
      payment.amount !== order.amount ||
      payment.currency !== order.currency
    ) {
      res.status(402).json({ error: 'Payment has not been captured for this subscription' })
      return
    }
    const subscription = await recordCapturedProviderSubscription(order, payment)
    if (!subscription) {
      res.status(409).json({ error: 'Payment was captured, but the subscription is not active yet' })
      return
    }
    res.status(201).json(subscription)
  } catch (err) {
    console.error('Could not verify Razorpay payment:', err)
    res.status(err.status ?? 500).json({ error: err.message ?? 'Could not verify payment' })
  }
})

app.get('/api/vendor/subscription', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }
    res.json({
      plans: providerSubscriptionPlans,
      subscription: getProviderSubscription(user),
    })
  } catch (err) {
    console.error('Could not load provider subscription:', err)
    res.status(500).json({ error: 'Could not load provider subscription' })
  }
})

app.post('/api/vendor/subscription/order', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }

    const plan = providerSubscriptionPlansById.get(req.body?.planId)
    if (!plan) {
      res.status(400).json({ error: 'Choose a valid provider subscription plan' })
      return
    }
    const amount = plan.priceRupees * 100
    const order = await razorpayRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: `m5${randomBytes(18).toString('hex')}`,
        notes: {
          purpose: 'provider_subscription',
          planId: plan.id,
          providerId: user.googleId,
        },
      }),
    })
    await paymentOrders.insertOne({
      razorpayOrderId: order.id,
      userId: user.googleId,
      purpose: 'provider_subscription',
      planId: plan.id,
      durationMonths: plan.durationMonths,
      amount,
      currency: 'INR',
      paymentEnvironment: 'live',
      status: 'created',
      createdAt: new Date(),
    })
    res.status(201).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      businessName: user.businessName || 'MAY5 provider',
      providerName: user.fullName ?? '',
      providerEmail: user.email ?? '',
      providerPhone: user.phone ?? '',
      planName: plan.name,
    })
  } catch (err) {
    console.error('Could not create provider subscription order:', err)
    res.status(err.status ?? 502).json({ error: err.message ?? 'Could not start provider subscription checkout' })
  }
})

app.post('/api/bookings', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'customer') {
      res.status(403).json({ error: 'Customer account required' })
      return
    }
    const { salonId, serviceId, staffId, scheduledAt, paymentMode, acknowledgeDemoOffline } = req.body ?? {}
    const demoService = demoServices.get(serviceId)
    const isDemoListing = Boolean(demoService)
    if (typeof salonId !== 'string' || !salonId.trim()) {
      res.status(400).json({ error: 'Choose a valid business' })
      return
    }
    if (
      (isDemoListing && (demoService.salonId !== salonId || !demoSalonNames.has(salonId))) ||
      (!isDemoListing && (typeof serviceId !== 'string' || !ObjectId.isValid(serviceId)))
    ) {
      res.status(400).json({ error: 'Choose a service from a live business listing' })
      return
    }
    if (isDemoListing && acknowledgeDemoOffline !== true) {
      res.status(400).json({ error: 'Confirm that this demo listing is not a real store before booking' })
      return
    }
    if (staffId !== undefined && typeof staffId !== 'string') {
      res.status(400).json({ error: 'Choose a valid staff member' })
      return
    }
    if (typeof scheduledAt !== 'string' || !Number.isFinite(Date.parse(scheduledAt)) || Date.parse(scheduledAt) <= Date.now()) {
      res.status(400).json({ error: 'Choose a future appointment date and time' })
      return
    }
    if (paymentMode !== 'offline') {
      res.status(400).json({ error: 'MAY5 does not collect service payments during booking. Pay directly with the business.' })
      return
    }
    if (isDemoListing) {
      const booking = {
        salonId,
        serviceId,
        ...(staffId ? { staffId } : {}),
        customerId: user.googleId,
        status: 'scheduled',
        scheduledAt: new Date(scheduledAt).toISOString(),
        paymentMode,
        paymentStatus: 'not_applicable',
        demoListing: true,
        mediaAuthorized: false,
        mediaUrls: [],
        createdAt: new Date(),
      }
      const result = await bookings.insertOne(booking)
      res.status(201).json({ ...booking, id: result.insertedId.toString() })
      return
    }
    const [vendor, service] = await Promise.all([
      users.findOne({ role: 'vendor', businessId: salonId }),
      vendorServices.findOne({
        _id: new ObjectId(serviceId),
        salonId,
        active: { $ne: false },
      }),
    ])
    if (!vendor || !service) {
      res.status(404).json({ error: 'The selected business or service is unavailable' })
      return
    }
    if (!getProviderSubscription(vendor)) {
      res.status(404).json({ error: 'This business is not currently accepting bookings' })
      return
    }
    const preferences = {
      ...defaultVendorPreferences.booking,
      ...(vendor.vendorPreferences?.booking ?? {}),
    }
    const booking = {
      salonId,
      serviceId,
      ...(staffId ? { staffId } : {}),
      customerId: user.googleId,
      status: !preferences.acceptInstantBooking || preferences.requiresApproval ? 'pending' : 'scheduled',
      scheduledAt: new Date(scheduledAt).toISOString(),
      paymentMode,
      mediaAuthorized: false,
      mediaUrls: [],
      createdAt: new Date(),
    }
    const result = await bookings.insertOne(booking)
    await createCustomerNotification(
      user,
      'booking_confirmation',
      booking.status === 'pending' ? 'Booking request sent' : 'Booking confirmed',
      booking.status === 'pending'
        ? `Your appointment request for ${new Date(booking.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} is awaiting business approval.`
        : `Your appointment is scheduled for ${new Date(booking.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.`,
      '/customer/bookings',
    )
    res.status(201).json({ ...booking, id: result.insertedId.toString() })
  } catch (err) {
    console.error('Could not save booking:', err)
    res.status(500).json({ error: 'Could not save booking' })
  }
})

app.get('/api/catalog', async (_req, res) => {
  try {
    const records = await users
      .find({
        role: 'vendor',
        businessId: { $type: 'string', $ne: '' },
        businessName: { $type: 'string', $ne: '' },
        address: { $type: 'string', $ne: '' },
        'vendorSubscription.status': 'active',
        'vendorSubscription.expiresAt': { $gt: new Date() },
      })
      .project({
        googleId: 1,
        businessId: 1,
        businessName: 1,
        businessType: 1,
        description: 1,
        address: 1,
        phone: 1,
        email: 1,
        website: 1,
        openingHours: 1,
        vendorPreferences: 1,
        locality: 1,
        city: 1,
        state: 1,
        pincode: 1,
        openingDays: 1,
        openingTime: 1,
        closingTime: 1,
        amenities: 1,
        shopPhoto: 1,
        targetAudience: 1,
        lat: 1,
        lng: 1,
      })
      .toArray()
    if (records.length === 0) {
      res.json({ salons: [], services: [] })
      return
    }

    const vendors = new Map(records.map((record) => [record.googleId, record]))
    const serviceRecords = await vendorServices
      .find({ vendorId: { $in: [...vendors.keys()] }, active: { $ne: false } })
      .sort({ createdAt: -1 })
      .toArray()
    const services = serviceRecords.map(({ _id, vendorId, createdAt: _createdAt, ...service }) => ({
      ...service,
      id: _id.toString(),
      salonId: vendors.get(vendorId).businessId,
    }))
    const servicesByVendor = new Map()
    for (const service of services) {
      servicesByVendor.set(service.salonId, [...(servicesByVendor.get(service.salonId) ?? []), service])
    }
    const bookableRecords = records.filter((record) => servicesByVendor.has(record.businessId))
    const contentRecords = await vendorContent
      .find({
        vendorId: { $in: [...vendors.keys()] },
        active: true,
        kind: { $in: ['package', 'portfolio', 'promotion'] },
      })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray()
    const contentByVendor = new Map()
    const today = new Date().toISOString().slice(0, 10)
    for (const record of contentRecords) {
      if (
        record.kind === 'promotion' &&
        ((record.startsAt && record.startsAt > today) || (record.endsAt && record.endsAt < today))
      ) {
        continue
      }
      const content = contentByVendor.get(record.vendorId) ?? { packages: [], portfolio: [], promotions: [] }
      const publicRecord = {
        id: record._id.toString(),
        title: record.title,
        description: record.description,
        serviceIds: record.serviceIds ?? [],
        price: record.price ?? null,
        imageUrl: record.imageUrl ?? '',
      }
      if (record.kind === 'package') content.packages.push(publicRecord)
      if (record.kind === 'portfolio' && publicRecord.imageUrl) content.portfolio.push(publicRecord)
      if (record.kind === 'promotion') content.promotions.push(record)
      contentByVendor.set(record.vendorId, content)
    }
    const salons = bookableRecords.map((record, index) => {
      const vendorServices = servicesByVendor.get(record.businessId) ?? []
      const vendorContent = contentByVendor.get(record.googleId) ?? { packages: [], portfolio: [], promotions: [] }
      const promotion = vendorContent.promotions[0]
      const categoryImage = record.businessType === 'Spa & wellness'
        ? 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80'
        : 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80'
      return {
        id: record.businessId,
        name: record.businessName,
        address: [record.address, record.locality, record.city, record.state, record.pincode].filter(Boolean).join(', '),
        rating: 0,
        coverImage: record.shopPhoto || categoryImage,
        homeService: vendorServices.some((service) => service.homeService),
        onlineServices: vendorServices.length > 0,
        promo: promotion ? `${promotion.discountPercent}% off · ${promotion.title}` : undefined,
        businessType: record.businessType,
        description: record.description,
        phone: record.phone,
        email: record.email,
        website: record.website,
        openingHours: record.openingHours,
        amenities: record.amenities ?? [],
        packages: vendorContent.packages,
        portfolio: vendorContent.portfolio,
        openingDays: record.openingDays ?? [],
        openingTime: record.openingTime ?? '',
        closingTime: record.closingTime ?? '',
        targetAudience: record.targetAudience ?? 'unisex',
        lat: Number.isFinite(record.lat) ? record.lat : 0,
        lng: Number.isFinite(record.lng) ? record.lng : 0,
        branchId: `vendor-${index}`,
      }
    })
    res.json({ salons, services })
  } catch (err) {
    console.error('MongoDB public catalog lookup failed:', err)
    res.status(500).json({ error: 'Could not load business listings' })
  }
})

app.get('/api/vendor/profile', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }
    res.json(toBusinessProfile(user))
  } catch (err) {
    console.error('Could not load vendor business profile:', err)
    res.status(500).json({ error: 'Could not load business profile' })
  }
})

app.patch('/api/vendor/profile', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }

    const profile = req.body ?? {}
    const fields = {}
    const required = ['businessName', 'businessType', 'address']
    for (const key of Object.keys(emptyBusinessProfile)) {
      const value = profile[key]
      if (value === undefined) continue
      const maxLength = key === 'shopPhoto' ? 7_000_000 : key === 'description' ? 800 : 240
      if (typeof value !== 'string' || value.trim().length > maxLength) {
        res.status(400).json({ error: `Enter valid ${key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}` })
        return
      }
      const normalized = value.trim()
      if (required.includes(key) && !normalized) {
        res.status(400).json({ error: `Business ${key} is required` })
        return
      }
      fields[key] = normalized
    }
    if (
      !Array.isArray(profile.openingDays) ||
      profile.openingDays.length === 0 ||
      profile.openingDays.length > 7 ||
      profile.openingDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
      new Set(profile.openingDays).size !== profile.openingDays.length
    ) {
      res.status(400).json({ error: 'Select at least one valid opening day' })
      return
    }
    fields.openingDays = profile.openingDays
    if (profile.amenities !== undefined) {
      if (
        !Array.isArray(profile.amenities) ||
        profile.amenities.length > 30 ||
        profile.amenities.some((amenity) => typeof amenity !== 'string' || !amenity.trim() || amenity.trim().length > 60)
      ) {
        res.status(400).json({ error: 'Choose valid store amenities' })
        return
      }
      fields.amenities = [...new Set(profile.amenities.map((amenity) => amenity.trim()))]
    }
    if (fields.pincode && !/^\d{6}$/.test(fields.pincode)) {
      res.status(400).json({ error: 'PIN code must be six digits' })
      return
    }
    if (fields.shopPhoto && !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(fields.shopPhoto)) {
      res.status(400).json({ error: 'Upload a JPEG, PNG, or WebP store photo' })
      return
    }
    if (fields.shopPhoto && Buffer.from(fields.shopPhoto.split(',')[1], 'base64').length > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Store photo must be 5 MB or smaller' })
      return
    }
    if (fields.targetAudience !== undefined && !['women', 'men', 'unisex'].includes(fields.targetAudience)) {
      res.status(400).json({ error: 'Choose a valid customer audience' })
      return
    }
    const hasLatitude = Object.hasOwn(profile, 'lat')
    const hasLongitude = Object.hasOwn(profile, 'lng')
    if (hasLatitude !== hasLongitude) {
      res.status(400).json({ error: 'Enter both store coordinates or leave both blank' })
      return
    }
    if (hasLatitude) {
      const { lat, lng } = profile
      if (
        (lat === null && lng === null) ||
        (Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
          Number.isFinite(lng) && lng >= -180 && lng <= 180)
      ) {
        fields.lat = lat
        fields.lng = lng
      } else {
        res.status(400).json({ error: 'Enter valid latitude and longitude coordinates' })
        return
      }
    }
    if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      res.status(400).json({ error: 'Enter a valid business email address' })
      return
    }
    if (fields.phone && !/^[+\d\s().-]{7,24}$/.test(fields.phone)) {
      res.status(400).json({ error: 'Enter a valid business phone number' })
      return
    }
    if (fields.website && !/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(fields.website)) {
      res.status(400).json({ error: 'Website must start with http:// or https://' })
      return
    }
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(fields.openingTime ?? '') ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(fields.closingTime ?? '') ||
      fields.closingTime <= fields.openingTime
    ) {
      res.status(400).json({ error: 'Choose valid opening and closing times; closing must be later than opening' })
      return
    }
    if (!Object.keys(fields).length) {
      res.status(400).json({ error: 'No business profile details provided' })
      return
    }

    fields.businessId = user.businessId ?? randomBytes(12).toString('hex')
    const updated = await users.findOneAndUpdate(
      { googleId: user.googleId },
      { $set: { ...fields, updatedAt: new Date() } },
      { returnDocument: 'after' },
    )
    if (!updated) throw new Error('Vendor profile update returned no user')
    res.json(toBusinessProfile(updated))
  } catch (err) {
    console.error('Could not update vendor business profile:', err)
    res.status(500).json({ error: 'Could not save business profile' })
  }
})

app.get('/api/vendor/preferences', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }
    res.json({
      booking: { ...defaultVendorPreferences.booking, ...(user.vendorPreferences?.booking ?? {}) },
      customerManagement: {
        ...defaultVendorPreferences.customerManagement,
        ...(user.vendorPreferences?.customerManagement ?? {}),
      },
    })
  } catch (err) {
    console.error('Could not load vendor preferences:', err)
    res.status(500).json({ error: 'Could not load business preferences' })
  }
})

app.patch('/api/vendor/preferences', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }
    const { booking, customerManagement } = req.body ?? {}
    const booleanFields = [
      'acceptInstantBooking',
      'requiresApproval',
      'advanceBookingRequired',
    ]
    const customerBooleanFields = [
      'enableCustomerHistory',
      'enableAppointmentReminders',
      'enablePromotionalMessages',
    ]
    if (
      !booking ||
      booleanFields.some((key) => typeof booking[key] !== 'boolean') ||
      !Number.isInteger(booking.numberOfSlots) ||
      booking.numberOfSlots < 1 ||
      booking.numberOfSlots > 500 ||
      typeof booking.cancellationPolicy !== 'string' ||
      booking.cancellationPolicy.length > 1000 ||
      !customerManagement ||
      customerBooleanFields.some((key) => typeof customerManagement[key] !== 'boolean') ||
      ![2, 24, 48, 'custom'].includes(customerManagement.reminderIntervalHours) ||
      !Number.isInteger(customerManagement.customReminderHours) ||
      customerManagement.customReminderHours < 1 ||
      customerManagement.customReminderHours > 720
    ) {
      res.status(400).json({ error: 'Check booking and customer management settings' })
      return
    }
    const preferences = {
      booking: { ...booking, cancellationPolicy: booking.cancellationPolicy.trim() },
      customerManagement: { ...customerManagement },
    }
    await users.updateOne(
      { googleId: user.googleId },
      { $set: { vendorPreferences: preferences, updatedAt: new Date() } },
    )
    res.json(preferences)
  } catch (err) {
    console.error('Could not save vendor preferences:', err)
    res.status(500).json({ error: 'Could not save business preferences' })
  }
})

app.get('/api/vendor/content', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }
    const { kind } = req.query
    if (!['package', 'portfolio', 'promotion'].includes(kind)) {
      res.status(400).json({ error: 'Choose a valid business content type' })
      return
    }
    const items = await vendorContent.find({ vendorId: user.googleId, kind }).sort({ createdAt: -1 }).limit(200).toArray()
    res.json(items.map(({ _id, vendorId: _vendorId, ...item }) => ({ ...item, id: _id.toString() })))
  } catch (err) {
    console.error('Could not load vendor content:', err)
    res.status(500).json({ error: 'Could not load business content' })
  }
})

app.post('/api/vendor/content', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }
    const { kind, title, description, imageUrl, serviceIds, price, discountPercent, startsAt, endsAt, active } = req.body ?? {}
    if (
      !['package', 'portfolio', 'promotion'].includes(kind) ||
      typeof title !== 'string' || !title.trim() || title.trim().length > 120 ||
      typeof description !== 'string' || description.length > 1000 ||
      typeof imageUrl !== 'string' || imageUrl.length > 7_000_000 ||
      !Array.isArray(serviceIds) || serviceIds.length > 30 ||
      serviceIds.some((id) => typeof id !== 'string' || id.length > 120) ||
      (price !== null && (!Number.isFinite(price) || price < 0 || price > 1_000_000)) ||
      (discountPercent !== null && (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100)) ||
      typeof startsAt !== 'string' || startsAt.length > 40 ||
      typeof endsAt !== 'string' || endsAt.length > 40 ||
      typeof active !== 'boolean'
    ) {
      res.status(400).json({ error: 'Enter valid business content details' })
      return
    }
    if (imageUrl && !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(imageUrl)) {
      res.status(400).json({ error: 'Upload a JPEG, PNG, or WebP image' })
      return
    }
    if (imageUrl && Buffer.from(imageUrl.split(',')[1], 'base64').length > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Business image must be 5 MB or smaller' })
      return
    }
    if (
      (kind === 'portfolio' && !imageUrl) ||
      (kind === 'package' && (!serviceIds.length || !Number.isFinite(price) || price <= 0)) ||
      (kind === 'promotion' && !Number.isInteger(discountPercent))
    ) {
      res.status(400).json({ error: 'Complete the required details for this content type' })
      return
    }
    if (kind === 'package') {
      if (serviceIds.some((id) => !ObjectId.isValid(id))) {
        res.status(400).json({ error: 'Choose valid services for the package' })
        return
      }
      const ownedServices = await vendorServices.countDocuments({
        _id: { $in: serviceIds.map((id) => new ObjectId(id)) },
        vendorId: user.googleId,
      })
      if (ownedServices !== new Set(serviceIds).size) {
        res.status(400).json({ error: 'Packages can only include your own services' })
        return
      }
    }
    if (
      (startsAt && !Number.isFinite(Date.parse(startsAt))) ||
      (endsAt && !Number.isFinite(Date.parse(endsAt))) ||
      (startsAt && endsAt && Date.parse(endsAt) < Date.parse(startsAt))
    ) {
      res.status(400).json({ error: 'Enter a valid promotion date range' })
      return
    }
    const item = {
      vendorId: user.googleId,
      kind,
      title: title.trim(),
      description: description.trim(),
      imageUrl,
      serviceIds,
      price,
      discountPercent,
      startsAt,
      endsAt,
      active,
      createdAt: new Date().toISOString(),
    }
    const result = await vendorContent.insertOne(item)
    res.status(201).json({ ...item, id: result.insertedId.toString() })
  } catch (err) {
    console.error('Could not save vendor content:', err)
    res.status(500).json({ error: 'Could not save business content' })
  }
})

app.patch('/api/vendor/content/:id', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }
    if (!ObjectId.isValid(req.params.id) || typeof req.body?.active !== 'boolean') {
      res.status(400).json({ error: 'Invalid content update' })
      return
    }
    const updated = await vendorContent.findOneAndUpdate(
      { _id: new ObjectId(req.params.id), vendorId: user.googleId },
      { $set: { active: req.body.active, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' },
    )
    if (!updated) {
      res.status(404).json({ error: 'Business content not found' })
      return
    }
    const { _id, vendorId: _vendorId, ...item } = updated
    res.json({ ...item, id: _id.toString() })
  } catch (err) {
    console.error('Could not update vendor content:', err)
    res.status(500).json({ error: 'Could not update business content' })
  }
})

app.delete('/api/vendor/content/:id', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }
    if (!ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid business content' })
      return
    }
    const result = await vendorContent.deleteOne({ _id: new ObjectId(req.params.id), vendorId: user.googleId })
    if (!result.deletedCount) {
      res.status(404).json({ error: 'Business content not found' })
      return
    }
    res.status(204).end()
  } catch (err) {
    console.error('Could not delete vendor content:', err)
    res.status(500).json({ error: 'Could not delete business content' })
  }
})

app.get('/api/vendor/bookings', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor' || !user.businessId) {
      res.status(403).json({ error: 'Complete a business profile to manage appointments' })
      return
    }
    const records = await bookings.find({ salonId: user.businessId }).sort({ scheduledAt: 1 }).limit(500).toArray()
    const customerIds = [...new Set(records.map((booking) => booking.customerId))]
    const customerRecords = await users.find({ googleId: { $in: customerIds } }).project({ googleId: 1, fullName: 1, phone: 1 }).toArray()
    const customers = new Map(customerRecords.map((customer) => [customer.googleId, customer]))
    const serviceIds = [...new Set(records.map((booking) => booking.serviceId).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)))]
    const serviceRecords = await vendorServices.find({ _id: { $in: serviceIds }, vendorId: user.googleId }).project({ name: 1, price: 1 }).toArray()
    const services = new Map(serviceRecords.map((service) => [service._id.toString(), { name: service.name, price: service.price }]))
    res.json(records.map(({ _id, ...booking }) => {
      const customer = customers.get(booking.customerId)
      const service = services.get(booking.serviceId)
      return {
        ...booking,
        id: _id.toString(),
        customerName: customer?.fullName ?? 'Customer',
        customerPhone: customer?.phone ?? '',
        serviceName: service?.name ?? 'Service',
        servicePrice: service?.price ?? 0,
      }
    }))
  } catch (err) {
    console.error('Could not load vendor appointments:', err)
    res.status(500).json({ error: 'Could not load appointments' })
  }
})

app.patch('/api/vendor/bookings/:id', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor' || !user.businessId) {
      res.status(403).json({ error: 'Business account required' })
      return
    }
    const { status } = req.body ?? {}
    if (!ObjectId.isValid(req.params.id) || !['scheduled', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Choose a valid appointment status' })
      return
    }
    const updated = await bookings.findOneAndUpdate(
      { _id: new ObjectId(req.params.id), salonId: user.businessId },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' },
    )
    if (!updated) {
      res.status(404).json({ error: 'Appointment not found' })
      return
    }
    const { _id, ...booking } = updated
    const customer = await users.findOne(
      { googleId: booking.customerId },
      { projection: { fullName: 1, phone: 1 } },
    )
    const service = ObjectId.isValid(booking.serviceId)
      ? await vendorServices.findOne(
          { _id: new ObjectId(booking.serviceId), vendorId: user.googleId },
          { projection: { name: 1, price: 1 } },
        )
      : null
    res.json({
      ...booking,
      id: _id.toString(),
      customerName: customer?.fullName ?? 'Customer',
      customerPhone: customer?.phone ?? '',
      serviceName: service?.name ?? 'Service',
      servicePrice: service?.price ?? 0,
    })
  } catch (err) {
    console.error('Could not update appointment:', err)
    res.status(500).json({ error: 'Could not update appointment' })
  }
})

app.get('/api/vendor/customers', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor' || !user.businessId) {
      res.status(403).json({ error: 'Complete a business profile to view customers' })
      return
    }
    const preferences = {
      ...defaultVendorPreferences.customerManagement,
      ...(user.vendorPreferences?.customerManagement ?? {}),
    }
    if (!preferences.enableCustomerHistory) {
      res.status(403).json({ error: 'Customer history is disabled in customer management settings' })
      return
    }
    const records = await bookings.find({ salonId: user.businessId }).sort({ scheduledAt: -1 }).limit(5000).toArray()
    const history = new Map()
    for (const booking of records) {
      const existing = history.get(booking.customerId)
      if (existing) existing.bookingCount += 1
      else history.set(booking.customerId, { bookingCount: 1, lastVisit: booking.scheduledAt })
    }
    const customerIds = [...history.keys()]
    const customerRecords = await users.find({ googleId: { $in: customerIds } })
      .project({ googleId: 1, fullName: 1, phone: 1, email: 1 })
      .toArray()
    res.json(customerRecords.map((customer) => ({
      id: customer.googleId,
      fullName: customer.fullName ?? 'Customer',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      ...history.get(customer.googleId),
    })))
  } catch (err) {
    console.error('Could not load vendor customers:', err)
    res.status(500).json({ error: 'Could not load customers' })
  }
})

app.get('/api/vendor/services', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }

    const records = await vendorServices
      .find({ vendorId: user.googleId })
      .sort({ createdAt: -1 })
      .toArray()
    res.json(records.map(({ _id, ...service }) => ({
      ...service,
      active: service.active !== false,
      id: _id.toString(),
    })))
  } catch (err) {
    console.error('MongoDB vendor services lookup failed:', err)
    res.status(500).json({ error: 'Could not load services' })
  }
})

app.post('/api/vendor/services', async (req, res) => {
  let user
  try {
    user = await authenticatedUser(req)
  } catch (err) {
    console.error('Could not authenticate vendor service request:', err)
    res.status(500).json({ error: 'Could not save service' })
    return
  }
  if (!user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  if (user.role !== 'vendor') {
    res.status(403).json({ error: 'Business account required' })
    return
  }

  const {
    salonId,
    name,
    description = '',
    price,
    durationMin,
    category,
    homeService,
    imageData,
    imageDatas,
  } = req.body ?? {}
  const images = imageDatas === undefined ? [imageData] : imageDatas
  if (
    !user.businessId ||
    typeof salonId !== 'string' ||
    salonId.length === 0 ||
    salonId.length > 120 ||
    typeof name !== 'string' ||
    name.trim().length === 0 ||
    name.trim().length > 120 ||
    typeof description !== 'string' ||
    description.trim().length > 500 ||
    typeof price !== 'number' ||
    !Number.isFinite(price) ||
    price <= 0 ||
    typeof durationMin !== 'number' ||
    !Number.isInteger(durationMin) ||
    durationMin < 1 ||
    durationMin > 1440 ||
    !['popular', 'other'].includes(category) ||
    typeof homeService !== 'boolean' ||
    !Array.isArray(images) ||
    images.length < 1 ||
    images.length > 5 ||
    images.some((image) => typeof image !== 'string')
  ) {
    res.status(400).json({ error: 'Complete all service fields and upload between 1 and 5 images' })
    return
  }

  for (const image of images) {
    const imageMatch = image.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+=*)$/)
    if (!imageMatch || Buffer.from(imageMatch[2], 'base64').length > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Upload JPEG, PNG, or WebP images up to 5 MB each' })
      return
    }
  }

  const primaryImage = images[0]
  const service = {
    salonId: user.businessId,
    name: name.trim(),
    description: description.trim(),
    price,
    durationMin,
    category,
    homeService,
    active: true,
    imageUrl: primaryImage,
    imageUrls: images,
    vendorId: user.googleId,
    createdAt: new Date(),
  }
  try {
    const result = await vendorServices.insertOne(service)
    res.status(201).json({ ...service, id: result.insertedId.toString() })
  } catch (err) {
    console.error('MongoDB vendor service save failed:', err)
    res.status(500).json({ error: 'Could not save service' })
  }
})

app.patch('/api/vendor/services/:id', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }
    if (!ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid service ID' })
      return
    }
    const patch = req.body ?? {}
    const fields = {}
    if (patch.name !== undefined) {
      if (typeof patch.name !== 'string' || !patch.name.trim() || patch.name.trim().length > 120) {
        res.status(400).json({ error: 'Service name must be between 1 and 120 characters' })
        return
      }
      fields.name = patch.name.trim()
    }
    if (patch.description !== undefined) {
      if (typeof patch.description !== 'string' || patch.description.length > 500) {
        res.status(400).json({ error: 'Service description must be 500 characters or fewer' })
        return
      }
      fields.description = patch.description.trim()
    }
    if (patch.price !== undefined) {
      if (!Number.isFinite(patch.price) || patch.price <= 0 || patch.price > 1_000_000) {
        res.status(400).json({ error: 'Enter a valid service price' })
        return
      }
      fields.price = patch.price
    }
    if (patch.durationMin !== undefined) {
      if (!Number.isInteger(patch.durationMin) || patch.durationMin < 1 || patch.durationMin > 1440) {
        res.status(400).json({ error: 'Service duration must be from 1 to 1440 minutes' })
        return
      }
      fields.durationMin = patch.durationMin
    }
    if (patch.active !== undefined) {
      if (typeof patch.active !== 'boolean') {
        res.status(400).json({ error: 'Invalid service status' })
        return
      }
      fields.active = patch.active
    }
    if (!Object.keys(fields).length) {
      res.status(400).json({ error: 'No service changes provided' })
      return
    }
    const updated = await vendorServices.findOneAndUpdate(
      { _id: new ObjectId(req.params.id), vendorId: user.googleId },
      { $set: { ...fields, updatedAt: new Date() } },
      { returnDocument: 'after' },
    )
    if (!updated) {
      res.status(404).json({ error: 'Service not found' })
      return
    }
    const { _id, vendorId: _vendorId, createdAt: _createdAt, updatedAt: _updatedAt, ...service } = updated
    res.json({ ...service, id: _id.toString() })
  } catch (err) {
    console.error('Could not update vendor service:', err)
    res.status(500).json({ error: 'Could not update service' })
  }
})

app.get('/api/vendor/staff', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }

    const records = await vendorStaff
      .find({ vendorId: user.googleId })
      .sort({ createdAt: -1 })
      .toArray()
    res.json(records.map(({ _id, vendorId: _vendorId, createdAt: _createdAt, updatedAt: _updatedAt, ...staff }) => ({
      ...staff,
      id: _id.toString(),
    })))
  } catch (err) {
    console.error('MongoDB vendor staff lookup failed:', err)
    res.status(500).json({ error: 'Could not load staff' })
  }
})

app.post('/api/vendor/staff', async (req, res) => {
  let user
  try {
    user = await authenticatedUser(req)
  } catch (err) {
    console.error('Could not authenticate vendor staff request:', err)
    res.status(500).json({ error: 'Could not save staff member' })
    return
  }
  if (!user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  if (user.role !== 'vendor') {
    res.status(403).json({ error: 'Business account required' })
    return
  }

  const { salonId, fullName, position, phone = '', email = '' } = req.body ?? {}
  if (
    typeof salonId !== 'string' ||
    salonId.trim().length === 0 ||
    salonId.length > 120 ||
    typeof fullName !== 'string' ||
    fullName.trim().length === 0 ||
    fullName.trim().length > 120 ||
    typeof position !== 'string' ||
    position.trim().length === 0 ||
    position.trim().length > 80 ||
    typeof phone !== 'string' ||
    phone.length > 30 ||
    typeof email !== 'string' ||
    email.length > 254 ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    res.status(400).json({ error: 'Enter a name and role, with valid optional contact details' })
    return
  }

  const digits = phone.replace(/\D/g, '')
  const nationalNumber = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits
  if (phone && !/^[6-9]\d{9}$/.test(nationalNumber)) {
    res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number' })
    return
  }

  const staff = {
    vendorId: user.googleId,
    salonId: salonId.trim(),
    fullName: fullName.trim(),
    position: position.trim(),
    phone: phone ? `+91${nationalNumber}` : '',
    email: email.trim(),
    active: true,
    createdAt: new Date(),
  }
  try {
    const result = await vendorStaff.insertOne(staff)
    const { vendorId: _vendorId, createdAt: _createdAt, ...response } = staff
    res.status(201).json({ ...response, id: result.insertedId.toString() })
  } catch (err) {
    console.error('MongoDB vendor staff save failed:', err)
    res.status(500).json({ error: 'Could not save staff member' })
  }
})

app.patch('/api/vendor/staff/:id', async (req, res) => {
  let user
  try {
    user = await authenticatedUser(req)
  } catch (err) {
    console.error('Could not authenticate vendor staff update:', err)
    res.status(500).json({ error: 'Could not update staff member' })
    return
  }
  if (!user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  if (user.role !== 'vendor') {
    res.status(403).json({ error: 'Business account required' })
    return
  }
  if (!ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: 'Invalid staff member' })
    return
  }

  const { salonId, fullName, position, phone, email, active } = req.body ?? {}
  const fields = {}
  if (salonId !== undefined) {
    if (typeof salonId !== 'string' || !salonId.trim() || salonId.length > 120) {
      res.status(400).json({ error: 'Select a valid salon' })
      return
    }
    fields.salonId = salonId.trim()
  }
  if (fullName !== undefined) {
    if (typeof fullName !== 'string' || !fullName.trim() || fullName.trim().length > 120) {
      res.status(400).json({ error: 'Name must be between 1 and 120 characters' })
      return
    }
    fields.fullName = fullName.trim()
  }
  if (position !== undefined) {
    if (typeof position !== 'string' || !position.trim() || position.trim().length > 80) {
      res.status(400).json({ error: 'Role must be between 1 and 80 characters' })
      return
    }
    fields.position = position.trim()
  }
  if (phone !== undefined) {
    if (typeof phone !== 'string' || phone.length > 30) {
      res.status(400).json({ error: 'Enter a valid Indian mobile number' })
      return
    }
    const digits = phone.replace(/\D/g, '')
    const nationalNumber = digits.length === 12 && digits.startsWith('91')
      ? digits.slice(2)
      : digits
    if (phone && !/^[6-9]\d{9}$/.test(nationalNumber)) {
      res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number' })
      return
    }
    fields.phone = phone ? `+91${nationalNumber}` : ''
  }
  if (email !== undefined) {
    if (
      typeof email !== 'string' ||
      email.length > 254 ||
      (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    ) {
      res.status(400).json({ error: 'Enter a valid email address' })
      return
    }
    fields.email = email.trim()
  }
  if (active !== undefined) {
    if (typeof active !== 'boolean') {
      res.status(400).json({ error: 'Invalid staff status' })
      return
    }
    fields.active = active
  }
  if (Object.keys(fields).length === 0) {
    res.status(400).json({ error: 'No staff details to update' })
    return
  }

  try {
    const updated = await vendorStaff.findOneAndUpdate(
      { _id: new ObjectId(req.params.id), vendorId: user.googleId },
      { $set: { ...fields, updatedAt: new Date() } },
      { returnDocument: 'after' },
    )
    if (!updated) {
      res.status(404).json({ error: 'Staff member not found' })
      return
    }
    const { _id, vendorId: _vendorId, createdAt: _createdAt, updatedAt: _updatedAt, ...staff } = updated
    res.json({ ...staff, id: _id.toString() })
  } catch (err) {
    console.error('MongoDB vendor staff update failed:', err)
    res.status(500).json({ error: 'Could not update staff member' })
  }
})

app.delete('/api/vendor/staff/:id', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }
    if (!ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid staff member' })
      return
    }

    const result = await vendorStaff.deleteOne({
      _id: new ObjectId(req.params.id),
      vendorId: user.googleId,
    })
    if (result.deletedCount === 0) {
      res.status(404).json({ error: 'Staff member not found' })
      return
    }
    res.status(204).end()
  } catch (err) {
    console.error('MongoDB vendor staff deletion failed:', err)
    res.status(500).json({ error: 'Could not remove staff member' })
  }
})

app.get('/api/vendor/branches', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }
    const records = await vendorBranches
      .find({ vendorId: user.googleId })
      .sort({ createdAt: 1 })
      .toArray()
    res.json(records.map(({ _id, vendorId: _vendorId, createdAt: _createdAt, updatedAt: _updatedAt, ...branch }) => ({
      ...branch,
      id: _id.toString(),
    })))
  } catch (err) {
    console.error('Could not load vendor branches:', err)
    res.status(500).json({ error: 'Could not load stores' })
  }
})

app.post('/api/vendor/branches', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }

    const { name, address, seatCapacity, serviceCapacityPerHour } = req.body ?? {}
    if (
      typeof name !== 'string' || !name.trim() || name.trim().length > 80 ||
      typeof address !== 'string' || !address.trim() || address.trim().length > 200 ||
      !Number.isInteger(seatCapacity) || seatCapacity < 1 || seatCapacity > 500 ||
      !Number.isInteger(serviceCapacityPerHour) || serviceCapacityPerHour < 1 || serviceCapacityPerHour > 500
    ) {
      res.status(400).json({ error: 'Enter a store name, address, and valid capacity values' })
      return
    }

    const branch = {
      vendorId: user.googleId,
      name: name.trim(),
      address: address.trim(),
      seatCapacity,
      serviceCapacityPerHour,
      createdAt: new Date(),
    }
    const result = await vendorBranches.insertOne(branch)
    res.status(201).json({ ...branch, id: result.insertedId.toString() })
  } catch (err) {
    console.error('Could not create vendor branch:', err)
    res.status(500).json({ error: 'Could not add store' })
  }
})

app.patch('/api/vendor/branches/:id', async (req, res) => {
  try {
    const user = await authenticatedUser(req)
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (user.role !== 'vendor') {
      res.status(403).json({ error: 'Business account required' })
      return
    }
    if (!ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid store ID' })
      return
    }

    const patch = req.body ?? {}
    const fields = {}
    if (patch.name !== undefined) {
      if (typeof patch.name !== 'string' || !patch.name.trim() || patch.name.trim().length > 80) {
        res.status(400).json({ error: 'Store name must be between 1 and 80 characters' })
        return
      }
      fields.name = patch.name.trim()
    }
    if (patch.address !== undefined) {
      if (typeof patch.address !== 'string' || !patch.address.trim() || patch.address.trim().length > 200) {
        res.status(400).json({ error: 'Store address must be between 1 and 200 characters' })
        return
      }
      fields.address = patch.address.trim()
    }
    for (const key of ['seatCapacity', 'serviceCapacityPerHour']) {
      if (patch[key] !== undefined) {
        if (!Number.isInteger(patch[key]) || patch[key] < 1 || patch[key] > 500) {
          res.status(400).json({ error: 'Capacity must be a whole number between 1 and 500' })
          return
        }
        fields[key] = patch[key]
      }
    }
    if (!Object.keys(fields).length) {
      res.status(400).json({ error: 'No store changes provided' })
      return
    }

    const updated = await vendorBranches.findOneAndUpdate(
      { _id: new ObjectId(req.params.id), vendorId: user.googleId },
      { $set: { ...fields, updatedAt: new Date() } },
      { returnDocument: 'after' },
    )
    if (!updated) {
      res.status(404).json({ error: 'Store not found' })
      return
    }
    const { _id, vendorId: _vendorId, createdAt: _createdAt, updatedAt: _updatedAt, ...branch } = updated
    res.json({ ...branch, id: _id.toString() })
  } catch (err) {
    console.error('Could not update vendor branch:', err)
    res.status(500).json({ error: 'Could not update store' })
  }
})

app.get('/api/health', async (_req, res) => {
  try {
    await mongoClient.db('may5').command({ ping: 1 })
    res.json({ ok: true, database: 'connected' })
  } catch (err) {
    console.error('MongoDB health check failed:', err)
    res.status(503).json({ ok: false, database: 'unavailable' })
  }
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath))
  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next()
      return
    }
    res.sendFile(resolve(distPath, 'index.html'))
  })
}

async function start() {
  try {
    await mongoClient.connect()
    const database = mongoClient.db('may5')
    users = database.collection('users')
    sessions = database.collection('sessions')
    bookings = database.collection('bookings')
    paymentOrders = database.collection('paymentOrders')
    vendorServices = database.collection('vendorServices')
    vendorStaff = database.collection('vendorStaff')
    vendorBranches = database.collection('vendorBranches')
    supportReports = database.collection('supportReports')
    pushSubscriptions = database.collection('pushSubscriptions')
    customerNotifications = database.collection('customerNotifications')
    vendorContent = database.collection('vendorContent')
    const pushKeyStore = database.collection('systemConfiguration')
    const generatedVapidKeys = webpush.generateVAPIDKeys()
    const vapidKeys = await pushKeyStore.findOneAndUpdate(
      { _id: 'web-push-vapid' },
      {
        $setOnInsert: {
          publicKey: generatedVapidKeys.publicKey,
          privateKey: generatedVapidKeys.privateKey,
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' },
    )
    if (!vapidKeys?.publicKey || !vapidKeys?.privateKey) {
      throw new Error('Could not initialize server-side Web Push keys')
    }
    pushConfiguration = { publicKey: vapidKeys.publicKey }
    webpush.setVapidDetails(
      process.env.PUSH_CONTACT_EMAIL?.startsWith('mailto:')
        ? process.env.PUSH_CONTACT_EMAIL
        : `mailto:${process.env.PUSH_CONTACT_EMAIL ?? 'support@may5.app'}`,
      vapidKeys.publicKey,
      vapidKeys.privateKey,
    )
    await users.createIndex({ googleId: 1 }, { unique: true })
    await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    await sessions.createIndex({ userId: 1 })
    await bookings.createIndex({ customerId: 1, scheduledAt: -1 })
    await bookings.createIndex({ paymentOrderId: 1 }, { unique: true, sparse: true })
    await paymentOrders.createIndex({ razorpayOrderId: 1 }, { unique: true })
    await paymentOrders.createIndex({ userId: 1, createdAt: -1 })
    await vendorServices.createIndex({ vendorId: 1, createdAt: -1 })
    await vendorStaff.createIndex({ vendorId: 1, createdAt: -1 })
    await vendorBranches.createIndex({ vendorId: 1, createdAt: 1 })
    await supportReports.createIndex({ userId: 1, createdAt: -1 })
    await pushSubscriptions.createIndex({ endpoint: 1 }, { unique: true })
    await pushSubscriptions.createIndex({ userId: 1 })
    await customerNotifications.createIndex({ userId: 1, createdAt: -1 })
    await vendorContent.createIndex({ vendorId: 1, kind: 1, createdAt: -1 })
    databaseAvailable = true

    async function sendUpcomingAppointmentReminders() {
      const now = new Date()
      const nextWindow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const upcoming = await bookings
        .find({
          status: 'scheduled',
          scheduledAt: { $gte: now.toISOString(), $lte: nextWindow.toISOString() },
          reminderSentAt: { $exists: false },
        })
        .sort({ scheduledAt: 1 })
        .limit(2000)
        .toArray()
      const vendorsByBusiness = new Map()
      for (const booking of upcoming) {
        let vendor = vendorsByBusiness.get(booking.salonId)
        if (vendor === undefined) {
          vendor = await users.findOne({ businessId: booking.salonId, role: 'vendor' })
          vendorsByBusiness.set(booking.salonId, vendor ?? null)
        }
        const vendorPreferences = {
          ...defaultVendorPreferences.customerManagement,
          ...(vendor?.vendorPreferences?.customerManagement ?? {}),
        }
        if (!vendorPreferences.enableAppointmentReminders) continue
        const reminderHours = vendorPreferences.reminderIntervalHours === 'custom'
          ? vendorPreferences.customReminderHours
          : vendorPreferences.reminderIntervalHours
        const scheduledAt = Date.parse(booking.scheduledAt)
        if (now.getTime() < scheduledAt - reminderHours * 60 * 60 * 1000) continue
        const claimed = await bookings.updateOne(
          { _id: booking._id, reminderSentAt: { $exists: false } },
          { $set: { reminderSentAt: new Date() } },
        )
        if (claimed.modifiedCount !== 1) continue
        const user = await users.findOne({ googleId: booking.customerId })
        if (!user || !notificationEnabled(user, 'appointment_reminder')) continue
        await createCustomerNotification(
          user,
          'appointment_reminder',
          'Appointment reminder',
          `Your appointment at ${new Date(booking.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} is coming up soon.`,
          '/customer/bookings',
        )
      }
    }

    const reminderTimer = setInterval(() => {
      void sendUpcomingAppointmentReminders().catch((err) => {
        console.error('Could not send appointment reminders:', err)
      })
    }, 60_000)
    reminderTimer.unref()
    void sendUpcomingAppointmentReminders().catch((err) => {
      console.error('Could not send initial appointment reminders:', err)
    })

    console.log('MAY5 connected to MongoDB')
  } catch (err) {
    databaseAvailable = false
    console.error('Could not connect to MongoDB:', err)
    console.warn('MAY5 will retry MongoDB connection in 30 seconds; database-backed API routes return 503 until it recovers.')
    const retryTimer = setTimeout(() => {
      void start()
    }, 30_000)
    retryTimer.unref()
  }
}

app.listen(port, '0.0.0.0', () => {
  console.log(`MAY5 server listening on port ${port}`)
})

void start()
