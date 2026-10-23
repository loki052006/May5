import { Link } from 'react-router-dom'
import { getState, store } from '../../lib/store'
import { useEffect, useState } from 'react'
import { subscribe } from '../../lib/store'

export function BookingLocationPrefPage() {
  const [, tick] = useState(0)
  useEffect(() => subscribe(() => tick((n) => n + 1)), [])
  const pref = getState().bookingLocationPref

  return (
    <div className="may5-page-pad">
      <h1>Home or Explore</h1>
      <p style={{ color: 'var(--may5-muted)' }}>Choose whether you prefer at-home services or visiting the salon.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        <button
          type="button"
          className={`may5-card ${pref === 'home' ? 'may5-chip active' : ''}`}
          style={{ padding: 16, textAlign: 'left', border: pref === 'home' ? '2px solid var(--may5-terracotta)' : undefined }}
          onClick={() => store.setBookingLocationPref('home')}
        >
          <strong>At-home service</strong>
          <p style={{ margin: '8px 0 0', color: 'var(--may5-muted)' }}>Filter Explore for mobile service providers.</p>
        </button>
        <button
          type="button"
          className="may5-card"
          style={{ padding: 16, textAlign: 'left', border: pref === 'salon' ? '2px solid var(--may5-terracotta)' : undefined }}
          onClick={() => store.setBookingLocationPref('salon')}
        >
          <strong>Visit salon</strong>
          <p style={{ margin: '8px 0 0', color: 'var(--may5-muted)' }}>Book when it works for you at the location.</p>
        </button>
      </div>
      <Link to="/customer/profile" style={{ display: 'inline-block', marginTop: 20 }}>
        Done
      </Link>
    </div>
  )
}
