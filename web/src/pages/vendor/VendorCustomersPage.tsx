import { useEffect, useState } from 'react'
import { loadVendorCustomers } from '../../lib/api'
import type { VendorCustomer } from '../../lib/types'
import { useAuth } from '../../lib/auth'
import { formatIndianDate } from '../../lib/format'

export function VendorCustomersPage() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<VendorCustomer[]>([])
  const [loading, setLoading] = useState(user?.authProvider === 'google' || user?.authProvider === 'demo')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.authProvider !== 'google' && user?.authProvider !== 'demo') return
    let active = true
    void loadVendorCustomers()
      .then((items) => {
        if (active) setCustomers(items)
      })
      .catch((err: unknown) => {
        console.error('Could not load business customers:', err)
        if (active) setError(err instanceof Error ? err.message : 'Could not load customers.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user?.authProvider])

  return (
    <>
      <h1>Customers</h1>
      <p style={{ color: 'var(--may5-muted)' }}>Customer details and visit history from appointments at your business.</p>
      {loading && <p role="status">Loading customers…</p>}
      {error && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{error}</p>}
      {!loading && !error && customers.length === 0 && (
        <p style={{ color: 'var(--may5-muted)' }}>Customer history will appear here after your first appointment.</p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {customers.map((customer) => (
          <article key={customer.id} className="may5-card" style={{ padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>{customer.fullName}</h2>
            {customer.phone && <p><a href={`tel:${customer.phone}`}>{customer.phone}</a></p>}
            {customer.email && <p><a href={`mailto:${customer.email}`}>{customer.email}</a></p>}
            <p>{customer.bookingCount} appointment{customer.bookingCount === 1 ? '' : 's'}</p>
            <small style={{ color: 'var(--may5-muted)' }}>
              Last appointment {customer.lastVisit ? formatIndianDate(new Date(customer.lastVisit)) : 'not available'}
            </small>
          </article>
        ))}
      </div>
    </>
  )
}
