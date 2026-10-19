export function AdminApprovalsPage() {
  const items = [
    { id: '1', name: 'Glamour Wave Salon', status: 'pending' },
    { id: '2', name: 'Urban Glow Studio', status: 'pending' },
  ]
  return (
    <>
      <h1>Approvals</h1>
      {items.map((i) => (
        <div key={i.id} className="may5-card" style={{ padding: 14, marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span>{i.name}</span>
          <button type="button" className="may5-btn may5-btn-primary" style={{ minHeight: 36 }}>
            Approve
          </button>
        </div>
      ))}
    </>
  )
}
