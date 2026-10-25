import { useEffect, useMemo, useState } from 'react'
import { loadVendorBookings } from '../../lib/api'
import { formatINR } from '../../lib/format'
import type { VendorBooking } from '../../lib/types'

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function startOfWeek(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - day)
  return start
}

export function VendorAnalyticsPage() {
  const [bookings, setBookings] = useState<VendorBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void loadVendorBookings()
      .then((items) => {
        if (active) setBookings(items)
      })
      .catch((err: unknown) => {
        console.error('Could not load business analytics:', err)
        if (active) setError(err instanceof Error ? err.message : 'Could not load analytics.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const metrics = useMemo(() => {
    const weekStart = startOfWeek(new Date())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const inWeek = bookings.filter((booking) => {
      const date = new Date(booking.scheduledAt)
      return date >= weekStart && date < weekEnd
    })
    const completed = inWeek.filter((booking) => booking.status === 'completed')
    const revenue = completed.reduce((sum, booking) => sum + booking.servicePrice, 0)
    const dailyRevenue = weekdays.map((_, index) => {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + index)
      return completed
        .filter((booking) => {
          const bookingDate = new Date(booking.scheduledAt)
          return bookingDate.getFullYear() === date.getFullYear() &&
            bookingDate.getMonth() === date.getMonth() &&
            bookingDate.getDate() === date.getDate()
        })
        .reduce((sum, booking) => sum + booking.servicePrice, 0)
    })
    const customers = new Map<string, number>()
    for (const booking of bookings) {
      customers.set(booking.customerId, (customers.get(booking.customerId) ?? 0) + 1)
    }
    const repeatCustomers = [...customers.values()].filter((count) => count > 1).length
    const topServices = [...bookings.reduce((totals, booking) => {
      const current = totals.get(booking.serviceName) ?? { count: 0, revenue: 0 }
      current.count += 1
      if (booking.status === 'completed') current.revenue += booking.servicePrice
      totals.set(booking.serviceName, current)
      return totals
    }, new Map<string, { count: number; revenue: number }>()).entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
    return {
      weekBookings: inWeek.length,
      revenue,
      dailyRevenue,
      repeatRate: customers.size ? Math.round((repeatCustomers / customers.size) * 100) : 0,
      topServices,
    }
  }, [bookings])
  const maxDailyRevenue = Math.max(1, ...metrics.dailyRevenue)

  return (
    <>
      <h1>Analytics</h1>
      {loading && <p role="status">Loading analytics…</p>}
      {error && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{error}</p>}
      <div className="may5-kpi-grid" style={{ marginTop: 16 }}>
        <Metric title="This week revenue" value={formatINR(metrics.revenue)} />
        <Metric title="Bookings this week" value={String(metrics.weekBookings)} />
        <Metric title="Average rating" value="—" hint="Ratings are not yet available" />
        <Metric title="Repeat customers" value={`${metrics.repeatRate}%`} />
      </div>
      <section className="may5-card" style={{ padding: 16, marginTop: 20 }}>
        <h2>Revenue this week</h2>
        <div aria-label="Daily completed-service revenue" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(24px, 1fr))', alignItems: 'end', gap: 10, minHeight: 180, marginTop: 20 }}>
          {metrics.dailyRevenue.map((amount, index) => (
            <div key={weekdays[index]} style={{ display: 'grid', alignItems: 'end', gap: 8, height: '100%', textAlign: 'center' }}>
              <span title={formatINR(amount)} style={{ display: 'block', height: `${Math.max(4, (amount / maxDailyRevenue) * 130)}px`, alignSelf: 'end', borderRadius: 6, background: 'var(--may5-terracotta)' }} />
              <small style={{ color: 'var(--may5-muted)' }}>{weekdays[index]}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="may5-card" style={{ padding: 16, marginTop: 16 }}>
        <h2>Top services</h2>
        {!metrics.topServices.length ? <p style={{ color: 'var(--may5-muted)' }}>No appointments yet.</p> : (
          <div style={{ display: 'grid', gap: 10 }}>
            {metrics.topServices.map(([name, stats]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span>{name} · {stats.count} booking{stats.count === 1 ? '' : 's'}</span>
                <strong>{formatINR(stats.revenue)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function Metric({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="may5-card may5-kpi">
      <h3>{title}</h3>
      <p>{value}</p>
      {hint && <small style={{ color: 'var(--may5-muted)' }}>{hint}</small>}
    </div>
  )
}
