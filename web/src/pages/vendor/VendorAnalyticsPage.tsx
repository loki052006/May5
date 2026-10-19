import { useEffect, useState } from 'react'
import { staff, services } from '../../lib/mockData'
import { formatINR } from '../../lib/format'
import { getState } from '../../lib/store'
import { loadVendorStaff } from '../../lib/api'
import type { VendorStaff } from '../../lib/types'
import { useAuth } from '../../lib/auth'

export function VendorAnalyticsPage() {
  const { user } = useAuth()
  const [team, setTeam] = useState<VendorStaff[]>([])
  const [loadError, setLoadError] = useState('')
  useEffect(() => {
    if (user?.authProvider !== 'google' && user?.authProvider !== 'demo') return
    let active = true
    void loadVendorStaff()
      .then((members) => {
        if (active) setTeam(members.filter((member) => member.active))
      })
      .catch((err: unknown) => {
        console.error('Could not load staff performance data:', err)
        if (active) setLoadError(err instanceof Error ? err.message : 'Could not load staff data.')
      })
    return () => {
      active = false
    }
  }, [user?.authProvider])
  const bookings = getState().bookings
  const completed = bookings.filter((booking) => booking.status === 'completed')
  const hasAccountStaff = user?.authProvider === 'google' || user?.authProvider === 'demo'
  const staffToTrack = hasAccountStaff
    ? team.map((member) => ({
        id: member.id,
        fullName: member.fullName,
        avatarUrl: '',
        rating: 0,
      }))
    : staff
  const trackedStaff = staffToTrack.map((member) => {
    const assignedBookings = bookings.filter((booking) => booking.staffId === member.id)
    const completedBookings = assignedBookings.filter((booking) => booking.status === 'completed')
    const revenue = completedBookings.reduce((total, booking) => {
      const service = services.find((item) => item.id === booking.serviceId)
      return total + (service?.price ?? 0)
    }, 0)
    return { ...member, bookingCount: assignedBookings.length, completedCount: completedBookings.length, revenue }
  })

  return (
    <>
      <h1>Staff performance</h1>
      <p style={{ color: 'var(--may5-muted)' }}>Track appointments and completed-service revenue by staff member.</p>
      {loadError && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{loadError}</p>}
      <div className="may5-kpi-grid" style={{ marginTop: 16 }}>
        <div className="may5-card may5-kpi">
          <h3>Team members</h3>
          <p>{trackedStaff.length}</p>
        </div>
        <div className="may5-card may5-kpi">
          <h3>Completed services</h3>
          <p>{completed.length}</p>
        </div>
      </div>
      <div className="may5-kpi-grid" style={{ marginTop: 16 }}>
        {trackedStaff.map((s) => (
          <div key={s.id} className="may5-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {s.avatarUrl ? (
                <img src={s.avatarUrl} alt="" loading="lazy" decoding="async" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <span aria-hidden="true" style={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--may5-cream)', fontWeight: 700 }}>
                  {s.fullName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div>
                <strong>{s.fullName}</strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--may5-muted)' }}>
                  {s.rating ? `★ ${s.rating} · ` : ''}{s.bookingCount} bookings
                </p>
              </div>
            </div>
            <p style={{ marginTop: 12, color: 'var(--may5-muted)' }}>Completed: {s.completedCount}</p>
            <p style={{ marginTop: 0, color: 'var(--may5-success)' }}>Revenue {formatINR(s.revenue)}</p>
          </div>
        ))}
      </div>
      {staffToTrack.length === 0 && !loadError && (
        <p style={{ color: 'var(--may5-muted)', marginTop: 16 }}>No active staff members to report yet.</p>
      )}
    </>
  )
}
