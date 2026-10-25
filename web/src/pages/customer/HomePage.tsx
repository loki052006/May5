import { Link } from 'react-router-dom'
import { Bell, Flower2, Grid2X2, Hand, Heart, MapPin, Scissors, Search, Sparkles, UserRound } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { getState, subscribe } from '../../lib/store'
import { useEffect, useState } from 'react'
import { usePublicCatalog } from '../../lib/usePublicCatalog'
import { isSalonOpenNow } from '../../lib/format'

export function CustomerHomePage() {
  const { user, toggleFavorite } = useAuth()
  const [, tick] = useState(0)
  const [favoriteError, setFavoriteError] = useState('')
  const { salons, services, loading, error: catalogError } = usePublicCatalog()
  useEffect(() => subscribe(() => tick((n) => n + 1)), [])
  const favorites = getState().favorites
  const categories = [
    { label: 'Hair', icon: Scissors },
    { label: 'Barber & Grooming', icon: UserRound },
    { label: 'Spa & Massage', icon: Flower2 },
    { label: 'Nails', icon: Hand },
    { label: 'Facial & Skincare', icon: Sparkles },
    { label: 'Explore more', icon: Grid2X2 },
  ]

  async function onToggleFavorite(salonId: string) {
    setFavoriteError('')
    try {
      await toggleFavorite(salonId)
    } catch (err) {
      console.error('Could not save salon favorite:', err)
      setFavoriteError('Could not save this favorite. Please try again.')
    }
  }

  return (
    <>
      <header className="may5-header-mobile">
        <div className="may5-header-row home-location-row">
          <Link to="/customer/profile/addresses" className="home-location">
            <MapPin size={18} />
            <span>{user?.locationLabel ?? 'Choose your location'}</span>
          </Link>
          <Link to="/customer/profile/notifications" className="home-notifications" aria-label="Notifications">
            <Bell size={21} />
          </Link>
        </div>
      </header>

      <div className="may5-page-pad">
        <div className="may5-search">
          <Search size={18} color="#82796A" />
          <input placeholder="Search for haircut, spa, salon..." readOnly onFocus={() => { window.location.href = '/customer/explore' }} />
        </div>

        <section style={{ marginTop: 24 }}>
          <div className="home-category-grid">
            {categories.map(({ label, icon: Icon }) => (
              <Link
                key={label}
                to={label === 'Explore more' ? '/customer/explore' : `/customer/explore?category=${encodeURIComponent(label)}`}
                className={`home-category ${label === 'Explore more' ? 'home-category-more' : ''}`}
              >
                <span className="home-category-icon"><Icon size={24} /></span>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Special Offers</h2>
            <Link to="/customer/explore" style={{ color: 'var(--may5-terracotta)', fontWeight: 600 }}>
              See All
            </Link>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', marginTop: 12 }}>
            {salons.filter((salon) => salon.promo).map((salon) => (
              <Link key={salon.id} to={`/salon/${salon.id}`} className="may5-card" style={{ minWidth: 200, overflow: 'hidden' }}>
                <img src={salon.coverImage} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                <p style={{ padding: '8px 12px', margin: 0, fontWeight: 600 }}>{salon.promo}</p>
                <p style={{ padding: '0 12px 8px', margin: 0, color: 'var(--may5-muted)' }}>{salon.name}</p>
              </Link>
            ))}
            {salons.every((salon) => !salon.promo) && !loading && (
              <p style={{ color: 'var(--may5-muted)' }}>No live offers right now.</p>
            )}
          </div>
        </section>

        <section style={{ marginTop: 24 }}>
          <div className="home-section-heading"><h2>Nearby for you</h2><Link to="/customer/explore">See all</Link></div>
          {favoriteError && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{favoriteError}</p>}
          {catalogError && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{catalogError}</p>}
          <div className="home-salon-list">
            {salons.slice(0, 5).map((salon) => (
              <article key={salon.id} className="may5-card home-salon-card">
                <Link to={`/salon/${salon.id}`}>
                  <img src={salon.coverImage} alt="" loading="lazy" decoding="async" />
                </Link>
                <button type="button" className="home-favorite" aria-label={favorites.includes(salon.id) ? 'Remove from saved salons' : 'Save salon'} aria-pressed={favorites.includes(salon.id)} onClick={() => void onToggleFavorite(salon.id)}>
                  <Heart size={18} fill={favorites.includes(salon.id) ? '#c67139' : 'none'} color="#c67139" />
                </button>
                <Link to={`/salon/${salon.id}`} className="home-salon-copy">
                  {salon.promo && <span className="may5-tag">{salon.promo}</span>}
                  <h3>{salon.name}</h3>
                  <p>{salon.businessType ?? 'Salon'} · {salon.rating > 0 ? `★ ${salon.rating}` : 'New on MAY5'}</p>
                  <p className={isSalonOpenNow(salon.openingHours) ? 'home-open' : 'home-closed'}>{isSalonOpenNow(salon.openingHours) ? 'Open now' : salon.openingHours ? 'Closed now' : 'Hours unavailable'} · {services.filter((service) => service.salonId === salon.id).length} services</p>
                  {salon.demoListing && <span className="may5-tag">Sample listing</span>}
                </Link>
              </article>
            ))}
          </div>
          {salons.length === 0 && (
            <p role="status" style={{ color: 'var(--may5-muted)' }}>
              {loading
                ? 'Loading bookable businesses…'
                : catalogError || 'No bookable businesses yet. Check back after a business publishes its services.'}
            </p>
          )}
        </section>

        <section style={{ marginTop: 24 }}>
          <div className="home-section-heading"><h2>Open now</h2><Link to="/customer/explore?openNow=true">See all</Link></div>
          <div className="home-salon-list">
            {salons.filter((salon) => isSalonOpenNow(salon.openingHours)).slice(0, 5).map((salon) => (
              <Link key={salon.id} to={`/salon/${salon.id}`} className="may5-card home-open-card">
                <img src={salon.coverImage} alt="" loading="lazy" decoding="async" />
                <div><strong>{salon.name}</strong><p>{salon.businessType ?? 'Salon'} · Open now</p></div>
              </Link>
            ))}
          </div>
          {!loading && salons.length > 0 && salons.every((salon) => !isSalonOpenNow(salon.openingHours)) && (
            <p style={{ color: 'var(--may5-muted)' }}>No bookable businesses are open right now.</p>
          )}
        </section>
      </div>
    </>
  )
}
