export function VendorBookingPrefsPage() {
  return (
    <div>
      <h1>Booking preferences</h1>
      <div className="may5-card" style={{ padding: 16, marginTop: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" defaultChecked /> Accept instant booking
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <input type="checkbox" defaultChecked /> Accept online payment
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <input type="checkbox" /> Advance payment required
        </label>
      </div>
    </div>
  )
}
