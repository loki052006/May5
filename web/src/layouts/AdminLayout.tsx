import { NavLink, Outlet } from 'react-router-dom'
import {
  Building2,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../lib/auth'

const links = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/approvals', label: 'Approvals', icon: ShieldCheck },
  { to: '/admin/vendors', label: 'Vendors', icon: Building2 },
  { to: '/admin/more', label: 'More', icon: MoreHorizontal },
]

export function AdminLayout() {
  const { logout } = useAuth()

  return (
    <div className="may5-sidebar-layout">
      <aside className="may5-sidebar">
        <div className="may5-sidebar-brand">
          <img src="/may5-brand.png" alt="MAY5 — Sign your style" className="may5-logo" />
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
          className="may5-btn may5-btn-secondary"
          style={{ margin: '8px 12px' }}
          onClick={() => logout()}
        >
          <LogOut size={16} />
          Logout
        </button>
      </aside>
      <main className="may5-main-panel">
        <header style={{ marginBottom: 20 }}>
          <img src="/may5-brand.png" alt="MAY5 — Sign your style" className="may5-logo" />
        </header>
        <Outlet />
      </main>
    </div>
  )
}
