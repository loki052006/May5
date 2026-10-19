import cors from 'cors'
import { createHash, randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import 'dotenv/config'
import express from 'express'
import { OAuth2Client } from 'google-auth-library'
import { MongoClient, ObjectId } from 'mongodb'
import { fileURLToPath } from 'node:url'

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
let vendorServices
let vendorStaff
let vendorBranches

app.use(cors({ origin: true }))
app.use(express.json({ limit: '8mb' }))

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

app.post('/api/bookings', async (req, res) => {
  let user
  try {
    user = await authenticatedUser(req)
  } catch (err) {
    console.error('Could not authenticate booking request:', err)
    res.status(500).json({ error: 'Could not create booking' })
    return
  }
  if (!user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const { salonId, serviceId, staffId, scheduledAt, paymentMode } = req.body ?? {}
  if (
    typeof salonId !== 'string' ||
    typeof serviceId !== 'string' ||
    (staffId !== undefined && typeof staffId !== 'string') ||
    typeof scheduledAt !== 'string' ||
    !Number.isFinite(Date.parse(scheduledAt)) ||
    !['online', 'offline'].includes(paymentMode)
  ) {
    res.status(400).json({ error: 'Invalid booking details' })
    return
  }

  const booking = {
    salonId,
    serviceId,
    ...(staffId ? { staffId } : {}),
    customerId: user.googleId,
    status: 'scheduled',
    scheduledAt: new Date(scheduledAt).toISOString(),
    paymentMode,
    mediaAuthorized: false,
    mediaUrls: [],
    createdAt: new Date(),
  }

  try {
    const result = await bookings.insertOne(booking)
    res.status(201).json({ ...booking, id: result.insertedId })
  } catch (err) {
    console.error('MongoDB booking save failed:', err)
    res.status(500).json({ error: 'Could not save booking' })
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
    res.json(records.map(({ _id, ...service }) => ({ ...service, id: _id.toString() })))
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

  const { salonId, name, price, durationMin, category, homeService, imageData } =
    req.body ?? {}
  if (
    typeof salonId !== 'string' ||
    salonId.length === 0 ||
    salonId.length > 120 ||
    typeof name !== 'string' ||
    name.trim().length === 0 ||
    name.trim().length > 120 ||
    typeof price !== 'number' ||
    !Number.isFinite(price) ||
    price <= 0 ||
    typeof durationMin !== 'number' ||
    !Number.isInteger(durationMin) ||
    durationMin < 1 ||
    durationMin > 1440 ||
    !['popular', 'other'].includes(category) ||
    typeof homeService !== 'boolean' ||
    typeof imageData !== 'string'
  ) {
    res.status(400).json({ error: 'Complete all service fields and upload an image' })
    return
  }

  const imageMatch = imageData.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+=*)$/)
  if (!imageMatch || Buffer.from(imageMatch[2], 'base64').length > 5 * 1024 * 1024) {
    res.status(400).json({ error: 'Upload a JPEG, PNG, or WebP image up to 5 MB' })
    return
  }

  const service = {
    salonId,
    name: name.trim(),
    price,
    durationMin,
    category,
    homeService,
    imageUrl: imageData,
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
    vendorServices = database.collection('vendorServices')
    vendorStaff = database.collection('vendorStaff')
    vendorBranches = database.collection('vendorBranches')
    await users.createIndex({ googleId: 1 }, { unique: true })
    await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    await sessions.createIndex({ userId: 1 })
    await bookings.createIndex({ customerId: 1, scheduledAt: -1 })
    await vendorServices.createIndex({ vendorId: 1, createdAt: -1 })
    await vendorStaff.createIndex({ vendorId: 1, createdAt: -1 })
    await vendorBranches.createIndex({ vendorId: 1, createdAt: 1 })

    app.listen(port, '0.0.0.0', () => {
      console.log(`MAY5 server with MongoDB listening on port ${port}`)
    })
  } catch (err) {
    console.error('Could not connect to MongoDB:', err)
    process.exit(1)
  }
}

start()
