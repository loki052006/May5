import { getState, store } from '../../lib/store'
import type { SalonFilters } from '../../lib/types'

export function ExploreFilters({
  open,
  onClose,
  resultCount,
}: {
  open: boolean
  onClose: () => void
  resultCount: number
}) {
  if (!open) return null
  const filters = getState().filters

  function set(partial: Partial<SalonFilters>) {
    store.setFilters(partial)
  }

  return (
    <div className="may5-sheet" role="dialog" aria-modal="true">
      <div className="may5-sheet-panel">
        <h2 style={{ marginTop: 0 }}>Filter</h2>
        <p style={{ color: 'var(--may5-muted)', fontSize: '0.875rem' }}>Sort by</p>
        {(
          [
            ['distance', 'Distance'],
            ['top_reviewed', 'Top Reviewed'],
            ['most_popular', 'Most Popular'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} style={{ display: 'block', marginBottom: 8 }}>
            <input
              type="radio"
              name="sort"
              checked={filters.sort === key}
              onChange={() => set({ sort: key })}
            />{' '}
            {label}
          </label>
        ))}

        <p style={{ marginTop: 16 }}>Distance: {filters.maxDistanceKm} km</p>
        <input
          type="range"
          min={1}
          max={30}
          value={filters.maxDistanceKm}
          onChange={(e) => set({ maxDistanceKm: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--may5-terracotta)' }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {(
            [
              ['specialOffers', 'Special Offers'],
              ['homeService', 'Mobile Service'],
              ['onlineServices', 'Online Services'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`may5-chip ${filters[key] ? 'active' : ''}`}
              onClick={() => set({ [key]: !filters[key] })}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button type="button" className="may5-btn may5-btn-secondary" style={{ flex: 1 }} onClick={() => store.resetFilters()}>
            CLEAR
          </button>
          <button type="button" className="may5-btn may5-btn-primary" style={{ flex: 2 }} onClick={onClose}>
            SHOW {resultCount}+ PLACES
          </button>
        </div>
      </div>
    </div>
  )
}
