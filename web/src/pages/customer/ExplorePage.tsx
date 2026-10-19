import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Filter, Heart, Map, Search } from 'lucide-react'
import { getState, subscribe } from '../../lib/store'
import { salons } from '../../lib/mockData'
import { useAuth } from '../../lib/auth'
import { useEffect } from 'react'
import { ExploreFilters } from './ExploreFilters'

export function CustomerExplorePage() {
  const [, tick] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)
  const [q, setQ] = useState('')
  const [favoriteError, setFavoriteError] = useState('')
  const { toggleFavorite } = useAuth()

  useEffect(() => subscribe(() => tick((n) => n + 1)), [])

  const filters = getState().filters
  const favorites = getState().favorites

  async function onToggleFavorite(salonId: string) {
    setFavoriteError('')
    try {
      await toggleFavorite(salonId)
    } catch (err) {
      console.error('Could not save salon favorite:', err)
      setFavoriteError('Could not save this favorite. Please try again.')
    }
  }

  const list = useMemo(() => {
    let items = [...salons]
    if (q.trim()) {
      const t = q.toLowerCase()
      items = items.filter((s) => s.name.toLowerCase().includes(t) || s.address.toLowerCase().includes(t))
    }
    if (filters.specialOffers) items = items.filter((s) => !!s.promo)
    if (filters.homeService) items = items.filter((s) => s.homeService)
    if (filters.onlineServices) items = items.filter((s) => s.onlineServices)
    if (filters.sort === 'top_reviewed') items.sort((a, b) => b.rating - a.rating)
    return items
  }, [q, filters])

  return (
    <>
      <header className="may5-header-mobile">
        <h1>Explore</h1>
        <div className="may5-search" style={{ marginTop: 12, background: '#fff' }}>
          <Search size={18} />
          <input placeholder="Search salons..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </header>

      <div className="may5-page-pad">
        {list.map((salon) => (
          <article key={salon.id} className="may5-card" style={{ marginBottom: 16, overflow: 'hidden', position: 'relative' }}>
            <button
              type="button"
              aria-label="Favorite"
              onClick={() => void onToggleFavorite(salon.id)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                cursor: 'pointer',
              }}
            >
              <Heart
                size={18}
                fill={favorites.includes(salon.id) ? '#c67139' : 'none'}
                color="#c67139"
              />
            </button>
            <Link to={`/salon/${salon.id}`}>
              <img src={salon.coverImage} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: 180, objectFit: 'cover' }} />
              <div style={{ padding: 14 }}>
                {salon.promo && <span className="may5-tag">{salon.promo}</span>}
                <h3 style={{ margin: '8px 0 4px' }}>{salon.name}</h3>
                <p style={{ margin: 0, color: 'var(--may5-muted)', fontSize: '0.85rem' }}>
                  {salon.address} · ★ {salon.rating}
                </p>
              </div>
            </Link>
          </article>
        ))}
        {favoriteError && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{favoriteError}</p>}

        <div
          style={{
            position: 'fixed',
            bottom: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            borderRadius: 999,
            overflow: 'hidden',
            boxShadow: 'var(--may5-shadow)',
            maxWidth: 320,
            width: '90%',
          }}
        >
          <button
            type="button"
            className="may5-btn may5-btn-primary"
            style={{ flex: 1, borderRadius: 0 }}
            onClick={() => setFilterOpen(true)}
          >
            <Filter size={16} /> FILTER
          </button>
          <Link to="/customer/explore/map" className="may5-btn may5-btn-primary" style={{ flex: 1, borderRadius: 0, background: '#b2622d' }}>
            <Map size={16} /> MAP
          </Link>
        </div>
      </div>

      <ExploreFilters open={filterOpen} onClose={() => setFilterOpen(false)} resultCount={list.length} />
    </>
  )
}
