import { Link } from 'react-router-dom'

const shortcuts = [
  ['/vendor/customers', 'Customers'],
  ['/vendor/analytics', 'Analytics'],
  ['/vendor/portfolio', 'Portfolio'],
  ['/vendor/packages', 'Packages'],
  ['/vendor/promotions', 'Promotions'],
] as const

const businessLinks = [
  ['/vendor/settings#vendor-stores', 'My stores'],
  ['/vendor/settings', 'Business settings'],
  ['/vendor/booking-prefs', 'Booking preferences'],
  ['/vendor/customer-management', 'Customer management'],
  ['/vendor/help', 'Help & support'],
] as const

export function VendorMorePage() {
  return (
    <>
      <h1>More</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, margin: '16px 0 24px' }}>
        {shortcuts.map(([to, label]) => (
          <Link key={to} to={to} className="may5-card" style={{ minHeight: 92, padding: 16, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            {label}
          </Link>
        ))}
      </div>
      <h2>Business</h2>
      <div className="may5-card" style={{ padding: '0 16px' }}>
        {businessLinks.map(([to, label], index) => (
          <Link
            key={to}
            to={to}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              minHeight: 54,
              borderBottom: index === businessLinks.length - 1 ? 0 : '1px solid var(--may5-border)',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            <span>{label}</span><span aria-hidden="true">›</span>
          </Link>
        ))}
      </div>
    </>
  )
}
