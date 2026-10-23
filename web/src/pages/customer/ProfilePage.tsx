import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { formatIndianPhone } from '../../lib/format'
import { CustomerDeleteAccountLink, CustomerLogoutLink, CustomerProfileSectionLinks } from './CustomerSettingsPage'

export function CustomerProfilePage() {
  const { user } = useAuth()

  return (
    <>
      <header className="may5-header-mobile">
        <h1 className="settings-profile-title">Profile</h1>
      </header>
      <div className="may5-page-pad">
        <Link to="/customer/profile/edit" className="may5-card settings-account-card">
          <span className="settings-account-avatar">{user?.fullName?.slice(0, 1).toUpperCase() ?? '?'}</span>
          <span className="settings-account-details">
            <strong>{user?.fullName ?? 'MAY5 customer'}</strong>
            <small>{user?.email || formatIndianPhone(user?.phone)}</small>
          </span>
          <ChevronRight size={20} color="#82796A" />
        </Link>
        <CustomerProfileSectionLinks />
        <CustomerDeleteAccountLink />
        <CustomerLogoutLink>Log out</CustomerLogoutLink>
      </div>
    </>
  )
}
