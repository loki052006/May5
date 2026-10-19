import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getState, subscribe } from '../../lib/store'
import { services, salons } from '../../lib/mockData'

export function HistoryPage() {
  const [, tick] = useState(0)
  useEffect(() => subscribe(() => tick((n) => n + 1)), [])

  const completed = getState().bookings.filter((b) => b.mediaAuthorized)

  return (
    <div className="may5-page-pad">
      <h1>Booking history</h1>
      <p style={{ color: 'var(--may5-muted)', fontSize: '0.9rem' }}>
        Booking history is shared with the business you book with. Media is shown only when authorized.
      </p>
      {completed.length === 0 ? (
        <p>No authorized media yet.</p>
      ) : (
        completed.map((b) => {
          const svc = services.find((s) => s.id === b.serviceId)
          const salon = salons.find((s) => s.id === b.salonId)
          return (
            <div key={b.id} className="may5-card" style={{ padding: 14, marginTop: 12 }}>
              <strong>{svc?.name}</strong> at {salon?.name}
              <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto' }}>
                {b.mediaUrls?.map((url) => (
                  <img key={url} src={url} alt="" loading="lazy" decoding="async" style={{ width: 120, height: 120, borderRadius: 8, objectFit: 'cover' }} />
                ))}
              </div>
            </div>
          )
        })
      )}
      <Link to="/customer/profile">Back to profile</Link>
    </div>
  )
}
