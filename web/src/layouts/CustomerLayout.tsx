import { NavLink, Outlet } from 'react-router-dom'
import { Calendar, Heart, Home, Search, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function CustomerLayout() {
  const { user } = useAuth()

  return (
    <div className="may5-mobile-shell">
      <Link to="/customer/home" aria-label="MAY5 home" className="may5-mobile-brand">
        <img src="/may5-brand.png" alt="MAY5 — Sign your style" className="may5-logo" />
      </Link>
      <aside className="may5-app-promo" aria-label="MAY5 mobile app advertisement">
        <p className="settings-sr-only">
          Discover more with MAY5. Download the mobile app for a richer booking experience and exclusive features.
        </p>
        <div className="may5-app-promo-viewport" aria-hidden="true">
          <div className="may5-app-promo-track">
            <span>Discover more with MAY5. Download the mobile app for a richer booking experience and exclusive features.</span>
            <span>Discover more with MAY5. Download the mobile app for a richer booking experience and exclusive features.</span>
          </div>
        </div>
      </aside>
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
          Bookings
        </NavLink>
        <NavLink to="/customer/favorites" className={({ isActive }) => (isActive ? 'active' : '')}>
          <Heart size={22} />
          Saved
        </NavLink>
        <NavLink to="/customer/profile" className={({ isActive }) => (isActive ? 'active' : '')}>
          <User size={22} />
          Profile
        </NavLink>
      </nav>
    </div>
  )
}
