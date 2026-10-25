import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Heart, List, Map, Search } from 'lucide-react'
import { getState, store, subscribe } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { useEffect } from 'react'
import { ExploreFilters } from './ExploreFilters'
import { usePublicCatalog } from '../../lib/usePublicCatalog'
import { isSalonOpenNow } from '../../lib/format'
import { SalonMap } from './SalonMap'

export function CustomerExplorePage() {
  const [, tick] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)
  const [q, setQ] = useState('')
  const [selectedSalon, setSelectedSalon] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const [favoriteError, setFavoriteError] = useState('')
  const { toggleFavorite } = useAuth()
  const { salons, services, loading, error: catalogError } = usePublicCatalog()

  useEffect(() => subscribe(() => tick((n) => n + 1)), [])

  const filters = getState().filters
  const favorites = getState().favorites
  const category = searchParams.get('category') ?? filters.serviceCategory
  const mapMode = searchParams.get('view') === 'map'
  useEffect(() => {
    if (searchParams.get('openNow') === 'true') store.setFilters({ openNow: true })
  }, [searchParams])

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
      items = items.filter((s) =>
        s.name.toLowerCase().includes(t) ||
        s.address.toLowerCase().includes(t) ||
        services.some((service) => service.salonId === s.id && service.name.toLowerCase().includes(t)),
      )
    }
    if (filters.specialOffers) items = items.filter((s) => !!s.promo)
    if (filters.homeService) items = items.filter((s) => s.homeService)
    if (filters.onlineServices) items = items.filter((s) => s.onlineServices)
    if (filters.openNow) items = items.filter((s) => isSalonOpenNow(s.openingHours))
    if (filters.rating45) items = items.filter((s) => s.rating >= 4.5)
    if (filters.ladiesOnly) items = items.filter((s) => s.targetAudience === 'women')
    if (category) {
      const normalized = category.toLowerCase()
      items = items.filter((salon) => {
        const salonCategory = `${salon.businessType ?? ''} ${salon.name}`.toLowerCase()
        return services.some((service) =>
          service.salonId === salon.id &&
          `${service.name} ${service.description ?? ''}`.toLowerCase().includes(normalized.split(' ')[0]),
        ) || salonCategory.includes(normalized.split(' ')[0])
      })
    }
    if (filters.sort === 'top_reviewed') items.sort((a, b) => b.rating - a.rating)
    return items
  }, [q, filters, salons, services, category])

  return (
    <>
      <header className="may5-header-mobile">
        <h1>Explore</h1>
        <div className="may5-search" style={{ marginTop: 12, background: '#fff' }}>
          <Search size={18} />
          <input placeholder="Search for haircut, spa, salon..." value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" className="explore-view-toggle" onClick={() => setSearchParams(mapMode ? {} : { view: 'map', ...(category ? { category } : {}) })}>
            {mapMode ? <><List size={17} /> List</> : <><Map size={17} /> Map</>}
          </button>
        </div>
      </header>

      <div className="may5-page-pad">
        {catalogError && <p role="status" style={{ color: 'var(--may5-muted)' }}>{catalogError}</p>}
        <div className="explore-filter-label">Filters</div>
        <div className="explore-filter-chips">
          {([
            ['openNow', 'Open now'],
            ['rating45', 'Rating 4.5+'],
            ['specialOffers', 'Offers'],
            ['ladiesOnly', 'Ladies only'],
          ] as const).map(([key, label]) => (
            <button key={key} type="button" className={`may5-chip ${filters[key] ? 'active' : ''}`} aria-pressed={filters[key]} onClick={() => store.setFilters({ [key]: !filters[key] })}>{label}</button>
          ))}
        </div>
        <div className="explore-category-chips" aria-label="Service categories">
          {['Hair', 'Barber & Grooming', 'Spa & Massage', 'Nails', 'Facial & Skincare'].map((label) => (
            <button key={label} type="button" className={`may5-chip ${category === label ? 'active' : ''}`} aria-pressed={category === label} onClick={() => {
              const next = new URLSearchParams(searchParams)
              if (category === label) next.delete('category')
              else next.set('category', label)
              setSearchParams(next)
              store.setFilters({ serviceCategory: category === label ? '' : label })
            }}>{label}</button>
          ))}
        </div>

        {mapMode && (
          <SalonMap salons={list} selectedId={selectedSalon} onSelect={setSelectedSalon} />
        )}

        {list.map((salon) => (
          <article key={salon.id} className={`may5-card explore-salon-card ${mapMode ? 'explore-map-result' : ''}`}>
            <button
              type="button"
              aria-label={favorites.includes(salon.id) ? 'Remove from saved salons' : 'Save salon'}
              aria-pressed={favorites.includes(salon.id)}
              onClick={() => void onToggleFavorite(salon.id)}
              className="explore-favorite"
            >
              <Heart
                size={18}
                fill={favorites.includes(salon.id) ? '#c67139' : 'none'}
                color="#c67139"
              />
            </button>
            <Link to={`/salon/${salon.id}`}>
              <img src={salon.coverImage} alt="" loading="lazy" decoding="async" />
              <div className="explore-salon-info">
                {salon.promo && <span className="may5-tag">{salon.promo}</span>}
                <h3 style={{ margin: '8px 0 4px' }}>{salon.name}</h3>
                <p style={{ margin: 0, color: 'var(--may5-muted)', fontSize: '0.85rem' }}>
                  {salon.address} · {salon.rating > 0 ? `★ ${salon.rating}` : 'New on MAY5'}
                </p>
                <p style={{ margin: '6px 0 0', color: 'var(--may5-muted)', fontSize: '0.82rem' }}>
                  {salon.businessType ?? (salon.demoListing ? 'Sample business' : 'Salon')} · {services.filter((service) => service.salonId === salon.id).length} services
                </p>
                <div className="explore-card-tags">
                  <span className={isSalonOpenNow(salon.openingHours) ? 'home-open' : 'home-closed'}>{isSalonOpenNow(salon.openingHours) ? 'Open now' : salon.openingHours ? 'Closed now' : 'Hours unavailable'}</span>
                  {salon.targetAudience === 'women' && <span className="explore-audience">Ladies only</span>}
                  {salon.promo && <span className="may5-tag">{salon.promo}</span>}
                </div>
                {salon.demoListing && <span className="may5-tag" style={{ marginTop: 8, display: 'inline-block' }}>Sample listing</span>}
              </div>
            </Link>
          </article>
        ))}
        {list.length === 0 && (
          <p className="explore-empty" role="status">
            {loading
              ? 'Loading bookable businesses…'
              : catalogError
                ? catalogError
                : salons.length === 0
                  ? 'No bookable businesses yet. Check back after a business publishes its services.'
                  : 'No salons match these filters. Try clearing a filter or choosing another category.'}
          </p>
        )}
        {favoriteError && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{favoriteError}</p>}

        <button type="button" className="explore-filter-button may5-btn may5-btn-primary" onClick={() => setFilterOpen(true)}>More filters</button>
      </div>

      <ExploreFilters open={filterOpen} onClose={() => setFilterOpen(false)} resultCount={list.length} />
    </>
  )
}
