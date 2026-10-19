import { staff } from '../../lib/mockData'
import { formatINR } from '../../lib/format'

export function VendorAnalyticsPage() {
  return (
    <>
      <h1>Staff performance</h1>
      <p style={{ color: 'var(--may5-muted)' }}>Bookings by hour and top performers.</p>
      <div className="may5-kpi-grid" style={{ marginTop: 16 }}>
        {staff.map((s) => (
          <div key={s.id} className="may5-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <img src={s.avatarUrl} alt="" loading="lazy" decoding="async" style={{ width: 48, height: 48, borderRadius: '50%' }} />
              <div>
                <strong>{s.fullName}</strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--may5-muted)' }}>★ {s.rating} · 124 services</p>
              </div>
            </div>
            <p style={{ marginTop: 12, color: 'var(--may5-success)' }}>Revenue {formatINR(2414)}</p>
          </div>
        ))}
      </div>
    </>
  )
}
