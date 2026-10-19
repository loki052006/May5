import { branches, services } from '../../lib/mockData'
import { getState } from '../../lib/store'
import { formatINR, formatIndianDateOnly } from '../../lib/format'

export function VendorDashboardPage() {
  const bookings = getState().bookings
  const completed = bookings.filter((b) => b.status === 'completed').length
  const revenue = completed * 790
  const branch = branches[0]

  return (
    <>
      <h1 style={{ margin: '0 0 4px' }}>Hello, business owner</h1>
      <p style={{ color: 'var(--may5-muted)', marginTop: 0 }}>Your salon overview for this month.</p>
      <p style={{ textAlign: 'right', color: 'var(--may5-muted)', fontSize: '0.85rem' }}>
        {formatIndianDateOnly(new Date())}
      </p>

      <div className="may5-kpi-grid">
        <Kpi title="Monthly revenue forecast" value={formatINR(bookings.length * 790)} sub={`${bookings.length} upcoming bookings`} />
        <Kpi title="Completed appointments" value={String(completed || 2)} sub={`Average ticket: ${formatINR(790)}`} />
        <Kpi title="New customers" value="6" sub="Joined this month" />
        <Kpi title="Monthly revenue" value={formatINR(revenue || 1580)} sub="+100% vs last month" subColor="var(--may5-success)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 20 }}>
        <div className="may5-card" style={{ padding: 16 }}>
          <h3>Today</h3>
          {bookings.slice(0, 1).map((b) => (
            <div key={b.id} style={{ background: 'rgba(198,113,57,0.12)', padding: 12, borderRadius: 8 }}>
              <strong>Sample appointment</strong>
              <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>Blowout · 12:45 · {formatINR(8590)}</p>
            </div>
          ))}
        </div>
        <div className="may5-card" style={{ padding: 16 }}>
          <h3>Top services</h3>
          <p>#1 {services[3]?.name ?? 'Blowout'} — 2 appointments · {formatINR(1580)}</p>
        </div>
        <div className="may5-card" style={{ padding: 16 }}>
          <h3>Capacity ({branch.name})</h3>
          <p>Seats: {branch.seatCapacity} · Services/hr: {branch.serviceCapacityPerHour}</p>
        </div>
      </div>
    </>
  )
}

function Kpi({ title, value, sub, subColor }: { title: string; value: string; sub: string; subColor?: string }) {
  return (
    <div className="may5-card may5-kpi">
      <h3>{title}</h3>
      <p>{value}</p>
      <small style={{ color: subColor ?? 'var(--may5-muted)' }}>{sub}</small>
    </div>
  )
}
