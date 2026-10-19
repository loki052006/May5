import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getState, store, subscribe } from '../../lib/store'
import { salons, services, staff } from '../../lib/mockData'

function isVideo(url: string) {
  return /^data:video\//i.test(url) || /\.(mp4|webm|mov)(?:$|[?#])/i.test(url)
}

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
              <p style={{ margin: '4px 0', color: 'var(--may5-muted)', fontSize: '0.8rem' }}>
                {new Date(b.scheduledAt).toLocaleDateString('en-IN')}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto' }}>
                {b.mediaUrls?.map((url) => (
                  isVideo(url) ? (
                    <video
                      key={url}
                      src={url}
                      controls
                      playsInline
                      preload="metadata"
                      aria-label={`Video from ${salon?.name ?? 'your booking'}`}
                      style={{ width: 220, height: 140, borderRadius: 8, objectFit: 'cover' }}
                    />
                  ) : (
                    <img key={url} src={url} alt="Booking result" loading="lazy" decoding="async" style={{ width: 120, height: 120, borderRadius: 8, objectFit: 'cover' }} />
                  )
                ))}
              </div>
              {b.staffId && staff.some((member) => member.id === b.staffId) && (
                <button
                  type="button"
                  className="may5-btn may5-btn-secondary"
                  style={{ minHeight: 36, marginTop: 10 }}
                  aria-pressed={getState().followedVideos.includes(b.staffId)}
                  onClick={() => store.toggleVideoFollow(b.staffId!)}
                >
                  {getState().followedVideos.includes(b.staffId) ? 'Following stylist' : 'Follow stylist'}
                </button>
              )}
            </div>
          )
        })
      )}
      <Link to="/customer/profile">Back to profile</Link>
    </div>
  )
}
