export function VendorCalendarPage() {
  const hours = ['09:00', '10:00', '11:00', '12:00', '13:00']
  return (
    <>
      <h1>Calendar</h1>
      <div className="may5-card" style={{ padding: 16, marginTop: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th align="left">Time</th>
              <th>Mina</th>
              <th>Harper</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h}>
                <td>{h}</td>
                <td>{h === '11:00' ? 'Haircut — Vioretta' : '—'}</td>
                <td>{h === '12:00' ? 'Blowout — sample appointment' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
