import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Calendar,
  CreditCard,
  Ellipsis,
  LayoutDashboard,
  LogOut,
  Scissors,
  Settings,
  Users,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { loadVendorSubscription } from '../lib/api'

const links = [
  { to: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/vendor/calendar', label: 'Calendar', icon: Calendar },
  { to: '/vendor/staff', label: 'Staff', icon: Users },
  { to: '/vendor/customers', label: 'Customers', icon: Users },
  { to: '/vendor/services', label: 'Services', icon: Scissors },
  { to: '/vendor/settings', label: 'Settings', icon: Settings },
  { to: '/vendor/subscription', label: 'Subscription', icon: CreditCard },
  { to: '/vendor/more', label: 'More', icon: Ellipsis },
]

export function VendorLayout() {
  const { logout } = useAuth()
  const location = useLocation()
  const [subscriptionCheck, setSubscriptionCheck] = useState<{
    pathname: string
    active: boolean
  } | null>(null)
  const onSubscriptionPage = location.pathname === '/vendor/subscription'
  const subscriptionLoading = subscriptionCheck?.pathname !== location.pathname
  const subscriptionActive = subscriptionCheck?.pathname === location.pathname && subscriptionCheck.active

  useEffect(() => {
    let active = true
    void loadVendorSubscription()
      .then((result) => {
        if (active) {
          setSubscriptionCheck({
            pathname: location.pathname,
            active: Boolean(result.subscription),
          })
        }
      })
      .catch((err: unknown) => {
        console.error('Could not check provider subscription:', err)
        if (active) {
          setSubscriptionCheck({
            pathname: location.pathname,
            active: false,
          })
        }
      })
    return () => {
      active = false
    }
  }, [location.pathname])

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
          <img src="/may5-brand.png" alt="MAY5 — Sign your style" className="may5-logo" />
        </header>
        {subscriptionLoading && !onSubscriptionPage ? (
          <p role="status">Checking provider subscription…</p>
        ) : !subscriptionActive && !onSubscriptionPage ? (
          <Navigate to="/vendor/subscription" replace />
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  )
}
