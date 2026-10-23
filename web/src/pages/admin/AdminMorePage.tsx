import { Link } from 'react-router-dom'

export function AdminMorePage() {
  const links = [
    '/admin/users',
    '/admin/bookings',
    '/admin/finance',
    '/admin/app-stats',
    '/admin/maintenance',
    '/admin/support',
  ]
  return (
    <>
      <h1>More</h1>
      {links.map((to) => (
        <Link key={to} to={to} className="may5-card" style={{ display: 'block', padding: 14, marginTop: 8 }}>
          {to.replace('/admin/', '')}
        </Link>
      ))}
    </>
  )
}
