import { branches } from '../../lib/mockData'
import { useState } from 'react'

export function VendorSettingsPage() {
  const [branchId, setBranchId] = useState(branches[0].id)
  const branch = branches.find((b) => b.id === branchId)!

  return (
    <>
      <h1>Settings</h1>
      <section className="may5-card" style={{ padding: 16, marginTop: 16 }}>
        <h3>Multi-store / branches</h3>
        <select className="may5-input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} — {b.address}
            </option>
          ))}
        </select>
      </section>
      <section className="may5-card" style={{ padding: 16, marginTop: 16 }}>
        <h3>Seat & service capacity</h3>
        <p>Seats: {branch.seatCapacity}</p>
        <p>Max services per hour: {branch.serviceCapacityPerHour}</p>
      </section>
      <section className="may5-card" style={{ padding: 16, marginTop: 16 }}>
        <h3>Video following</h3>
        <p style={{ color: 'var(--may5-muted)' }}>Portfolio videos from APK expo-video module — follow stylists from explore.</p>
      </section>
    </>
  )
}
