import { useEffect, useState } from 'react'
import { getState } from '../../lib/store'
import { formatINR, formatIndianDateOnly } from '../../lib/format'
import { loadVendorBookings, loadVendorBranches } from '../../lib/api'
import type { Branch, VendorBooking } from '../../lib/types'
import { useAuth } from '../../lib/auth'

function isInMonth(value: string, year: number, month: number) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.getFullYear() === year && date.getMonth() === month
}

function appointmentTime(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
    : 'Time unavailable'
}

export function VendorDashboardPage() {
  const { user } = useAuth()
  const remote = user?.authProvider === 'google' || user?.authProvider === 'demo'
  const [today] = useState(() => new Date())
  const [branches, setBranches] = useState<Branch[]>(() => remote ? [] : getState().vendorBranches)
  const [bookings, setBookings] = useState<VendorBooking[]>(() => remote ? [] : getState().bookings.map((booking) => ({
    ...booking,
    customerName: 'Customer',
    customerPhone: '',
    serviceName: 'Booked service',
    servicePrice: 0,
  })))
  const [loading, setLoading] = useState(remote)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!remote) return
    let active = true
    Promise.all([loadVendorBranches(), loadVendorBookings()])
      .then(([items, appointments]) => {
        if (!active) return
        setBranches(items)
        setBookings(appointments)
      })
      .catch((err: unknown) => {
        console.error('Could not load business dashboard:', err)
        if (active) setError(err instanceof Error ? err.message : 'Could not load the business dashboard.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [remote])

  const thisMonth = bookings.filter((booking) => isInMonth(booking.scheduledAt, today.getFullYear(), today.getMonth()))
  const completed = thisMonth.filter((booking) => booking.status === 'completed')
  const upcoming = thisMonth.filter((booking) =>
    (booking.status === 'pending' || booking.status === 'scheduled') &&
    new Date(booking.scheduledAt).getTime() >= today.getTime(),
  )
  const monthlyRevenue = completed.reduce((total, booking) => total + booking.servicePrice, 0)
  const monthlyCustomers = new Set(thisMonth.map((booking) => booking.customerId)).size
  const serviceCounts = thisMonth.reduce<Record<string, { name: string; count: number; revenue: number }>>((counts, booking) => {
    const entry = counts[booking.serviceId] ?? { name: booking.serviceName, count: 0, revenue: 0 }
    entry.count += 1
    if (booking.status === 'completed') entry.revenue += booking.servicePrice
    counts[booking.serviceId] = entry
    return counts
  }, {})
  const topService = Object.values(serviceCounts).sort((a, b) => b.count - a.count)[0]
  const todayAppointments = bookings
    .filter((booking) => {
      const date = new Date(booking.scheduledAt)
      return Number.isFinite(date.getTime()) &&
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate() &&
        booking.status !== 'cancelled'
    })
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))

  return (
    <>
      <h1 style={{ margin: '0 0 4px' }}>Hello, {user?.fullName || 'business owner'}</h1>
      <p style={{ color: 'var(--may5-muted)', marginTop: 0 }}>Your salon overview for this month.</p>
      <p style={{ textAlign: 'right', color: 'var(--may5-muted)', fontSize: '0.85rem' }}>
        {formatIndianDateOnly(today)}
      </p>

      {error && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{error}</p>}
      {loading && <p role="status">Loading business overview…</p>}
      <div className="may5-kpi-grid">
        <Kpi title="Monthly revenue" value={formatINR(monthlyRevenue)} sub={`${completed.length} completed appointments`} />
        <Kpi title="Completed appointments" value={String(completed.length)} sub={thisMonth.length ? `Average ticket: ${formatINR(monthlyRevenue / (completed.length || 1))}` : 'No appointments this month'} />
        <Kpi title="Customers this month" value={String(monthlyCustomers)} sub="Unique customers with appointments" />
        <Kpi title="Upcoming bookings" value={String(upcoming.length)} sub={`${upcoming.filter((booking) => booking.status === 'pending').length} awaiting approval`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 20 }}>
        <section className="may5-card" style={{ padding: 16 }}>
          <h3>Today’s appointments</h3>
          {!todayAppointments.length && <p style={{ color: 'var(--may5-muted)' }}>No appointments scheduled for today.</p>}
          {todayAppointments.map((booking) => (
            <div key={booking.id} style={{ background: 'rgba(198,113,57,0.12)', padding: 12, borderRadius: 8, marginTop: 8 }}>
              <strong>{booking.customerName}</strong>
              <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>
                {booking.serviceName} · {appointmentTime(booking.scheduledAt)} · {formatINR(booking.servicePrice)}
              </p>
              <small style={{ color: 'var(--may5-muted)' }}>{booking.status === 'pending' ? 'Awaiting approval' : booking.status}</small>
            </div>
          ))}
        </section>
        <section className="may5-card" style={{ padding: 16 }}>
          <h3>Top service this month</h3>
          {topService
            ? <p>{topService.name} — {topService.count} appointments · {formatINR(topService.revenue)} completed revenue</p>
            : <p style={{ color: 'var(--may5-muted)' }}>No service appointments this month.</p>}
        </section>
        {branches.map((branch) => (
          <section key={branch.id} className="may5-card" style={{ padding: 16 }}>
            <h3>Capacity ({branch.name})</h3>
            <p>Seats: {branch.seatCapacity} · Services/hr: {branch.serviceCapacityPerHour}</p>
          </section>
        ))}
      </div>
    </>
  )
}

function Kpi({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="may5-card may5-kpi">
      <h3>{title}</h3>
      <p>{value}</p>
      <small style={{ color: 'var(--may5-muted)' }}>{sub}</small>
    </div>
  )
}
