import { salons } from '../../lib/mockData'

export function AdminVendorsPage() {
  return (
    <>
      <h1>Vendors</h1>
      {salons.map((s) => (
        <div key={s.id} className="may5-card" style={{ padding: 14, marginTop: 8 }}>
          <strong>{s.name}</strong>
          <p style={{ margin: 4, color: 'var(--may5-muted)', fontSize: '0.85rem' }}>{s.address}</p>
        </div>
      ))}
    </>
  )
}
