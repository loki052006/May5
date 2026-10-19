import { NavLink, Outlet } from 'react-router-dom'
import {
  Calendar,
  LayoutDashboard,
  LogOut,
  Scissors,
  Settings,
  Users,
} from 'lucide-react'
import { useAuth } from '../lib/auth'

const links = [
  { to: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/vendor/calendar', label: 'Calendar', icon: Calendar },
  { to: '/vendor/staff', label: 'Staff', icon: Users },
  { to: '/vendor/customers', label: 'Customers', icon: Users },
  { to: '/vendor/services', label: 'Services', icon: Scissors },
  { to: '/vendor/settings', label: 'Settings', icon: Settings },
]

export function VendorLayout() {
  const { logout } = useAuth()

  return (
    <div className="may5-sidebar-layout">
      <aside className="may5-sidebar">
        <div className="may5-sidebar-brand">
          <img src="/may5-logo.svg" alt="MAY5" className="may5-logo" />
        </div>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          className="may5-btn"
          style={{ background: '#e53935', color: '#fff', margin: '8px 12px' }}
          onClick={() => logout()}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </aside>
      <main className="may5-main-panel">
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <img src="/may5-logo.svg" alt="MAY5" className="may5-logo" />
        </header>
        <Outlet />
      </main>
    </div>
  )
}
