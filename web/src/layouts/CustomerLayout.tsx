import { NavLink, Outlet } from 'react-router-dom'
import { Calendar, Home, Search, User } from 'lucide-react'
import { useAuth } from '../lib/auth'

export function CustomerLayout() {
  const { user } = useAuth()

  return (
    <div className="may5-mobile-shell">
      <Outlet context={{ user }} />
      <nav className="may5-bottom-nav" aria-label="Customer">
        <NavLink to="/customer/home" className={({ isActive }) => (isActive ? 'active' : '')}>
          <Home size={22} />
          Home
        </NavLink>
        <NavLink to="/customer/explore" className={({ isActive }) => (isActive ? 'active' : '')}>
          <Search size={22} />
          Search
        </NavLink>
        <NavLink to="/customer/bookings" className={({ isActive }) => (isActive ? 'active' : '')}>
          <Calendar size={22} />
          Calendar
        </NavLink>
        <NavLink to="/customer/profile" className={({ isActive }) => (isActive ? 'active' : '')}>
          <User size={22} />
          Profile
        </NavLink>
      </nav>
    </div>
  )
}
