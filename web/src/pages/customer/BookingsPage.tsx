import { useEffect, useState } from 'react'
import { getState, subscribe } from '../../lib/store'
import { formatIndianDate } from '../../lib/format'
import { usePublicCatalog } from '../../lib/usePublicCatalog'

export function CustomerBookingsPage() {
  const [, tick] = useState(0)
  const { salons, services } = usePublicCatalog()
  useEffect(() => subscribe(() => tick((n) => n + 1)), [])
  const bookings = getState().bookings

  return (
    <>
      <header className="may5-header-mobile">
        <h1>Bookings</h1>
      </header>
      <div className="may5-page-pad">
        {bookings.length === 0 ? (
          <p style={{ color: 'var(--may5-muted)' }}>No bookings yet. Explore salons to book.</p>
        ) : (
          bookings.map((b) => {
            const salon = salons.find((s) => s.id === b.salonId)
            const svc = services.find((s) => s.id === b.serviceId)
            return (
              <div key={b.id} className="may5-card" style={{ padding: 14, marginBottom: 12 }}>
                <strong>{svc?.name}</strong>
                <p style={{ margin: '4px 0', color: 'var(--may5-muted)', fontSize: '0.85rem' }}>
                  {salon?.name} · {formatIndianDate(b.scheduledAt)}
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  Status: {b.status} · Payment: {b.paymentMode}
                </p>
                {b.demoListing && (
                  <span className="may5-tag">
                    {b.paymentMode === 'offline'
                      ? 'Demo booking · no real store or service; no cash is due'
                      : 'Demo booking · payment is real; service is illustrative and not redeemable'}
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
