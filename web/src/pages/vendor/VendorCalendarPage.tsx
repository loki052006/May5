import { useEffect, useMemo, useState } from 'react'
import { loadVendorBookings, updateVendorBookingStatus } from '../../lib/api'
import type { VendorBooking } from '../../lib/types'
import { formatIndianDate } from '../../lib/format'

type View = 'today' | 'upcoming' | 'past' | 'date'

const viewLabels: Array<[View, string]> = [
  ['today', 'Today'],
  ['upcoming', 'Upcoming'],
  ['past', 'Past'],
  ['date', 'By date'],
]

function localDateKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function VendorCalendarPage() {
  const [bookings, setBookings] = useState<VendorBooking[]>([])
  const [view, setView] = useState<View>('today')
  const [selectedDate, setSelectedDate] = useState(localDateKey(new Date()))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState('')

  useEffect(() => {
    let active = true
    void loadVendorBookings()
      .then((items) => {
        if (active) setBookings(items)
      })
      .catch((err: unknown) => {
        console.error('Could not load vendor appointments:', err)
        if (active) setError(err instanceof Error ? err.message : 'Could not load appointments.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const visible = useMemo(() => {
    const today = localDateKey(new Date())
    return bookings.filter((booking) => {
      const date = localDateKey(booking.scheduledAt)
      if (view === 'today') return date === today
      if (view === 'upcoming') return date >= today && ['pending', 'scheduled'].includes(booking.status)
      if (view === 'past') return date < today || ['completed', 'cancelled'].includes(booking.status)
      return date === selectedDate
    }).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  }, [bookings, selectedDate, view])

  async function setStatus(booking: VendorBooking, status: VendorBooking['status']) {
    setError('')
    setSavingId(booking.id)
    try {
      await updateVendorBookingStatus(booking.id, status)
      setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, status } : item))
    } catch (err) {
      console.error('Could not update appointment status:', err)
      setError(err instanceof Error ? err.message : 'Could not update appointment.')
    } finally {
      setSavingId('')
    }
  }

  return (
    <>
      <h1>Appointments</h1>
      <nav aria-label="Appointment views" className="may5-card" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, margin: '16px 0' }}>
        {viewLabels.map(([value, label]) => (
          <button key={value} type="button" className={`may5-btn ${view === value ? 'may5-btn-primary' : ''}`} aria-pressed={view === value} onClick={() => setView(value)}>
            {label}
          </button>
        ))}
      </nav>
      {view === 'date' && (
        <label htmlFor="vendor-calendar-date">Choose date
          <input id="vendor-calendar-date" className="may5-input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </label>
      )}
      {loading && <p role="status">Loading appointments…</p>}
      {error && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{error}</p>}
      {!loading && !error && visible.length === 0 && (
        <div className="may5-card" style={{ padding: 24, textAlign: 'center', marginTop: 16 }}>
          <h2>Nothing here</h2>
          <p style={{ color: 'var(--may5-muted)' }}>Appointments in this view will appear here.</p>
        </div>
      )}
      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {visible.map((booking) => (
          <article key={booking.id} className="may5-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0 }}>{booking.customerName}</h2>
                <p style={{ margin: '6px 0', color: 'var(--may5-muted)' }}>{booking.serviceName}</p>
                <p style={{ margin: 0 }}>{formatIndianDate(new Date(booking.scheduledAt))} · {new Date(booking.scheduledAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</p>
                {booking.customerPhone && <a href={`tel:${booking.customerPhone}`}>{booking.customerPhone}</a>}
              </div>
              <span className="may5-tag">{booking.status}</span>
            </div>
            {booking.status === 'pending' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <button type="button" className="may5-btn may5-btn-primary" disabled={savingId === booking.id} onClick={() => void setStatus(booking, 'scheduled')}>Approve booking</button>
                <button type="button" className="may5-btn" disabled={savingId === booking.id} onClick={() => void setStatus(booking, 'cancelled')}>Decline</button>
              </div>
            )}
            {booking.status === 'scheduled' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <button type="button" className="may5-btn may5-btn-primary" disabled={savingId === booking.id} onClick={() => void setStatus(booking, 'completed')}>Mark complete</button>
                <button type="button" className="may5-btn" disabled={savingId === booking.id} onClick={() => void setStatus(booking, 'cancelled')}>Cancel</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  )
}
