import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getState, subscribe } from '../../lib/store'
import { usePublicCatalog } from '../../lib/usePublicCatalog'

export function HistoryPage() {
  const [, tick] = useState(0)
  const { salons, services } = usePublicCatalog()
  useEffect(() => subscribe(() => tick((n) => n + 1)), [])

  const bookings = getState().bookings

  return (
    <div className="may5-page-pad">
      <h1>Booking history</h1>
      <p style={{ color: 'var(--may5-muted)', fontSize: '0.9rem' }}>
        Your past and upcoming appointments.
      </p>
      {bookings.length === 0 ? (
        <p>No bookings yet.</p>
      ) : (
        bookings.map((booking) => {
          const service = services.find((item) => item.id === booking.serviceId)
          const salon = salons.find((item) => item.id === booking.salonId)
          return (
            <div key={booking.id} className="may5-card" style={{ padding: 14, marginTop: 12 }}>
              <strong>{service?.name ?? 'Appointment'}</strong>
              {salon && <span> at {salon.name}</span>}
              <p style={{ margin: '4px 0', color: 'var(--may5-muted)', fontSize: '0.8rem' }}>
                {new Date(booking.scheduledAt).toLocaleString('en-IN')}
              </p>
              <span className="may5-tag">{booking.status}</span>
            </div>
          )
        })
      )}
      <Link to="/customer/profile">Back to profile</Link>
    </div>
  )
}
