import { Link } from 'react-router-dom'

export function VendorMorePage() {
  const links = [
    ['/vendor/analytics', 'Analytics'],
    ['/vendor/booking-prefs', 'Booking prefs'],
    ['/vendor/billing', 'Billing'],
    ['/vendor/portfolio', 'Portfolio'],
    ['/vendor/promotions', 'Promotions'],
  ] as const
  return (
    <>
      <h1>More</h1>
      {links.map(([to, label]) => (
        <Link key={to} to={to} className="may5-card" style={{ display: 'block', padding: 14, marginTop: 8 }}>
          {label}
        </Link>
      ))}
    </>
  )
}
