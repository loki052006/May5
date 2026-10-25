import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { staff } from '../../lib/mockData'
import { store, getState } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { createGoogleBooking, createRazorpayOrder, verifyRazorpayPayment } from '../../lib/api'
import type { PaymentMode } from '../../lib/types'
import { usePublicCatalog } from '../../lib/usePublicCatalog'

interface RazorpayCheckoutResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayCheckoutOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill: { name: string; email: string; contact: string }
  handler: (response: RazorpayCheckoutResponse) => void
  modal: { ondismiss: () => void }
  theme: { color: string }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void }
  }
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => window.Razorpay ? resolve() : reject(new Error('Payment checkout could not be initialized.'))
    script.onerror = () => reject(new Error('Could not load Razorpay checkout. Check your connection and try again.'))
    document.head.appendChild(script)
  })
}

function localDateTimeMinimum() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

export function NewBookingPage() {
  const { serviceId } = useParams()
  const { services, salons, loading } = usePublicCatalog()
  const svc = services.find((s) => s.id === serviceId)
  const salon = salons.find((s) => s.id === svc?.salonId)
  const { user } = useAuth()
  const remote = user?.authProvider === 'google' || user?.authProvider === 'demo'
  const navigate = useNavigate()
  const [staffId, setStaffId] = useState('')
  const [when, setWhen] = useState('')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('online')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const pref = getState().bookingLocationPref

  if (!svc || !salon) return <p className="may5-page-pad" role="status">{loading ? 'Loading service…' : 'Service not found'}</p>

  const service = svc
  const salonRef = salon
  const team = staff.filter((s) => s.salonId === salonRef.id)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) {
      navigate('/auth/phone')
      return
    }
    setError('')
    if (remote && salonRef.demoListing) {
      setError('This sample listing is for display only. Choose a live business to make a booking.')
      return
    }
    const scheduledAt = new Date(when)
    if (!when || !Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      setError('Choose a future appointment date and time.')
      return
    }
    setSaving(true)
    try {
      const bookingDetails = {
        salonId: salonRef.id,
        serviceId: service.id,
        staffId: staffId || undefined,
        scheduledAt: scheduledAt.toISOString(),
        paymentMode,
      }
      let booking
      if (paymentMode === 'online') {
        if (!remote) throw new Error('Online payments require an authenticated MAY5 account.')
        const order = await createRazorpayOrder(bookingDetails)
        await loadRazorpayCheckout()
        if (!window.Razorpay) throw new Error('Payment checkout is unavailable. Please try again.')
        const payment = await new Promise<RazorpayCheckoutResponse>((resolve, reject) => {
          const checkout = new window.Razorpay!({
            key: order.keyId,
            amount: order.amount,
            currency: order.currency,
            name: order.businessName || 'MAY5',
            description: `${order.serviceName} appointment`,
            order_id: order.orderId,
            prefill: {
              name: order.customerName,
              email: order.customerEmail,
              contact: order.customerPhone,
            },
            handler: resolve,
            modal: { ondismiss: () => reject(new Error('Payment cancelled. You can try again.')) },
            theme: { color: '#c67139' },
          })
          checkout.open()
        })
        booking = await verifyRazorpayPayment(payment)
      } else if (remote) {
        booking = await createGoogleBooking(bookingDetails)
      } else {
        booking = {
          id: `bk-${Date.now()}`,
          customerId: user.id,
          ...bookingDetails,
          status: 'scheduled' as const,
          mediaAuthorized: false,
          mediaUrls: [],
        }
      }
      store.addBooking(booking)
      navigate('/customer/bookings')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create booking.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="may5-page-pad">
      <h1>Book this service</h1>
      <p>
        {service.name} at {salonRef.name}
      </p>
      {salonRef.demoListing && remote && (
        <p className="may5-tag" role="status">Sample listing — live bookings are not available.</p>
      )}
      {pref === 'home' && service.homeService && (
        <p className="may5-tag">At-home service selected</p>
      )}

      <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
        <label>Choose staff</label>
        <select className="may5-input" value={staffId} onChange={(e) => setStaffId(e.target.value)} style={{ marginBottom: 12 }}>
          <option value="">Any available</option>
          {team.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </select>

        <label>Date & time</label>
        <input
          type="datetime-local"
          className="may5-input"
          value={when}
          min={localDateTimeMinimum()}
          onChange={(e) => setWhen(e.target.value)}
          style={{ marginBottom: 12 }}
          required
        />

        <label>{salonRef.advancePaymentRequired ? 'Online payment required' : 'Payment'}</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className={`may5-chip ${paymentMode === 'online' ? 'active' : ''}`}
            onClick={() => setPaymentMode('online')}
          >
            Pay online
          </button>
          {!salonRef.advancePaymentRequired && (
            <button
              type="button"
              className={`may5-chip ${paymentMode === 'offline' ? 'active' : ''}`}
              onClick={() => setPaymentMode('offline')}
            >
              Pay at salon
            </button>
          )}
        </div>

        <button type="submit" className="may5-btn may5-btn-primary" style={{ width: '100%' }} disabled={saving || (remote && Boolean(salonRef.demoListing))}>
          {saving ? (paymentMode === 'online' ? 'Opening secure checkout…' : 'Saving booking…') : paymentMode === 'online' ? 'Continue to payment' : 'Confirm booking'}
        </button>
        {error && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{error}</p>}
      </form>
      <Link to={`/salon/${salonRef.id}`}>Back</Link>
    </div>
  )
}
