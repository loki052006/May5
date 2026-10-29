import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { staff } from '../../lib/mockData'
import { store } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { createGoogleBooking } from '../../lib/api'
import { usePublicCatalog } from '../../lib/usePublicCatalog'

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
  const navigate = useNavigate()
  const [staffId, setStaffId] = useState('')
  const [when, setWhen] = useState('')
  const [acknowledgeDemoListing, setAcknowledgeDemoListing] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

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
    const scheduledAt = new Date(when)
    if (!when || !Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      setError('Choose a future appointment date and time.')
      return
    }
    if (salonRef.demoListing && !acknowledgeDemoListing) {
      setError('Confirm that you understand this demo listing is not a real store.')
      return
    }
    setSaving(true)
    try {
      const bookingDetails = {
        salonId: salonRef.id,
        serviceId: service.id,
        staffId: staffId || undefined,
        scheduledAt: scheduledAt.toISOString(),
      }
      let booking
      if (user.authProvider === 'google' || user.authProvider === 'demo') {
        booking = await createGoogleBooking({
          ...bookingDetails,
          ...(salonRef.demoListing ? { acknowledgeDemoOffline: true } : {}),
        })
      } else {
        booking = {
          id: `bk-${Date.now()}`,
          customerId: user.id,
          ...bookingDetails,
          paymentMode: 'offline' as const,
          status: 'scheduled' as const,
          ...(salonRef.demoListing ? { demoListing: true } : {}),
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
      {salonRef.demoListing && (
        <p className="may5-tag" role="status">
          Demo listing — this is not a real store or redeemable service. This sample booking does not reserve a real appointment, and no payment is due.
        </p>
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

        {salonRef.demoListing && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16 }}>
            <input
              type="checkbox"
              checked={acknowledgeDemoListing}
              onChange={(e) => setAcknowledgeDemoListing(e.target.checked)}
              required
              style={{ marginTop: 4 }}
            />
            <span>I understand this is an illustrative demo listing, not a real store, and this sample booking does not reserve a real service or require payment.</span>
          </label>
        )}

        <p style={{ color: 'var(--may5-muted)' }}>
          No payment is collected through MAY5 when you book. Pay the service provider directly at the store.
        </p>

        <button type="submit" className="may5-btn may5-btn-primary" style={{ width: '100%' }} disabled={saving}>
          {saving ? 'Confirming booking…' : 'Confirm booking'}
        </button>
        {error && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{error}</p>}
      </form>
      <Link to={`/salon/${salonRef.id}`}>Back</Link>
    </div>
  )
}
