import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { salons } from '../../lib/mockData'
import { getState, subscribe } from '../../lib/store'

export function CustomerFavoritesPage() {
  const [, tick] = useState(0)
  useEffect(() => subscribe(() => tick((n) => n + 1)), [])
  const favs = salons.filter((s) => getState().favorites.includes(s.id))

  return (
    <>
      <header className="may5-header-mobile">
        <h1>Favorites</h1>
      </header>
      <div className="may5-page-pad">
        {favs.length === 0 ? (
          <p style={{ color: 'var(--may5-muted)' }}>Save salons from Explore to see them here.</p>
        ) : (
          favs.map((salon) => (
            <Link key={salon.id} to={`/salon/${salon.id}`} className="may5-card" style={{ display: 'block', marginBottom: 12, padding: 12 }}>
              <strong>{salon.name}</strong>
              <p style={{ margin: '4px 0 0', color: 'var(--may5-muted)', fontSize: '0.85rem' }}>{salon.address}</p>
            </Link>
          ))
        )}
      </div>
    </>
  )
}
