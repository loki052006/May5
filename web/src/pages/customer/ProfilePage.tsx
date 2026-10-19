import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { formatIndianPhone } from '../../lib/format'

const links = [
  { to: '/customer/profile/edit', label: 'Edit profile' },
  { to: '/customer/profile/history', label: 'Booking history & media' },
  { to: '/customer/favorites', label: 'Favorites' },
  { to: '/booking-location-pref', label: 'Home or Explore preference' },
  { to: '/customer/profile/payment-methods', label: 'Payment methods' },
  { to: '/customer/profile/help', label: 'Help' },
  { to: '/customer/profile/logout', label: 'Log out' },
]

export function CustomerProfilePage() {
  const { user } = useAuth()

  return (
    <>
      <header className="may5-header-mobile">
        <h1>Profile</h1>
      </header>
      <div className="may5-page-pad">
        <div className="may5-card" style={{ padding: 16 }}>
          <h2 style={{ margin: '0 0 12px' }}>{user?.fullName}</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            <p style={{ margin: 0 }}>
              <strong>Mobile:</strong> {formatIndianPhone(user?.phone)}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Email:</strong> {user?.email || 'Not provided'}
            </p>
          </div>
        </div>
        <nav style={{ marginTop: 16 }}>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="may5-card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                marginBottom: 8,
              }}
            >
              {l.label}
              <ChevronRight size={18} color="#82796A" />
            </Link>
          ))}
        </nav>
      </div>
    </>
  )
}
