import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowLeft, Heart, Share2 } from 'lucide-react'
import { getState, subscribe } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { formatINR } from '../../lib/format'
import { usePublicCatalog } from '../../lib/usePublicCatalog'
import type { ServiceItem } from '../../lib/types'

export function SalonDetailPage() {
  const { id } = useParams()
  const [, tick] = useState(0)
  const [serviceQuery, setServiceQuery] = useState('')
  const [favoriteError, setFavoriteError] = useState('')
  const { toggleFavorite } = useAuth()
  const { salons, services, loading, error: catalogError } = usePublicCatalog()
  useEffect(() => subscribe(() => tick((n) => n + 1)), [])
  const salon = salons.find((s) => s.id === id)
  if (!salon) {
    return (
      <p className="may5-page-pad" role="status">
        {loading ? 'Loading business…' : catalogError || 'This business has no active bookable services.'}
      </p>
    )
  }

  const salonId = salon.id
  const list = services
    .filter((s) => s.salonId === salon.id)
    .filter((s) => s.name.toLowerCase().includes(serviceQuery.trim().toLowerCase()))
  const popular = list.filter((s) => s.category === 'popular')
  const other = list.filter((s) => s.category === 'other')
  const fav = getState().favorites.includes(salon.id)

  async function onToggleFavorite() {
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
        <div className="may5-header-row">
          <Link to="/customer/explore" style={{ color: '#fff' }}>
            <ArrowLeft />
          </Link>
          <h1>{salon.name}</h1>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" aria-label="Toggle favorite" style={{ background: 'none', border: 'none', color: '#fff' }} onClick={() => void onToggleFavorite()}>
              <Heart fill={fav ? '#fff' : 'none'} />
            </button>
            <Share2 color="#fff" size={20} />
          </div>
        </div>
      </header>
      <div className="may5-page-pad">
        {favoriteError && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{favoriteError}</p>}
        {catalogError && <p role="status" style={{ color: 'var(--may5-muted)' }}>{catalogError}</p>}
        {salon.promo && <p className="may5-tag" style={{ display: 'inline-block' }}>{salon.promo}</p>}
        <section className="may5-card" style={{ padding: 14 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{salon.businessType ?? (salon.demoListing ? 'Sample beauty business' : 'MAY5 salon')}</p>
          <p style={{ color: 'var(--may5-muted)', margin: '6px 0' }}>{salon.address}</p>
          {salon.description && <p style={{ margin: '8px 0' }}>{salon.description}</p>}
          {salon.openingHours && <p style={{ margin: '6px 0' }}>Hours: {salon.openingHours}</p>}
          {salon.phone && <p style={{ margin: '6px 0' }}>Phone: <a href={`tel:${salon.phone}`}>{salon.phone}</a></p>}
          {salon.email && <p style={{ margin: '6px 0' }}>Email: <a href={`mailto:${salon.email}`}>{salon.email}</a></p>}
          {salon.website && <p style={{ margin: '6px 0' }}>Website: <a href={salon.website} target="_blank" rel="noreferrer">{salon.website}</a></p>}
          {salon.amenities && salon.amenities.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <strong>Amenities</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {salon.amenities.map((amenity) => <span key={amenity} className="may5-tag">{amenity}</span>)}
              </div>
            </div>
          )}
          {salon.demoListing && <span className="may5-tag">Sample listing — details are illustrative</span>}
        </section>
        {salon.packages && salon.packages.length > 0 && (
          <section style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: '1rem' }}>Packages</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {salon.packages.map((item) => (
                <article key={item.id} className="may5-card" style={{ padding: 14 }}>
                  <strong>{item.title}</strong>
                  {item.price !== null && <p style={{ margin: '6px 0' }}>{formatINR(item.price)}</p>}
                  {item.description && <p style={{ margin: '6px 0' }}>{item.description}</p>}
                  {item.serviceIds.length > 0 && (
                    <p style={{ color: 'var(--may5-muted)', margin: '6px 0 0' }}>
                      Includes: {item.serviceIds.map((serviceId) => services.find((service) => service.id === serviceId)?.name ?? 'Service').join(' · ')}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
        {salon.portfolio && salon.portfolio.length > 0 && (
          <section style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: '1rem' }}>Portfolio</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
              {salon.portfolio.map((item) => (
                <article key={item.id} className="may5-card" style={{ overflow: 'hidden' }}>
                  <img src={item.imageUrl} alt={item.title} loading="lazy" style={{ width: '100%', height: 150, objectFit: 'cover' }} />
                  <div style={{ padding: 10 }}>
                    <strong>{item.title}</strong>
                    {item.description && <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>{item.description}</p>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        <div className="may5-search" style={{ marginTop: 16 }}>
          <input
            aria-label="Search services"
            placeholder="Search services..."
            value={serviceQuery}
            onChange={(event) => setServiceQuery(event.target.value)}
          />
        </div>

        {list.length === 0 && <p style={{ color: 'var(--may5-muted)' }}>This business has not published services yet.</p>}
        <Section title="Popular Services" items={popular} />
        <Section title="Other Services" items={other} />
      </div>
    </>
  )
}

function Section({ title, items }: { title: string; items: ServiceItem[] }) {
  return (
    <section style={{ marginTop: 20 }}>
      <h2 style={{ fontSize: '1rem' }}>{title}</h2>
      {items.map((svc) => (
        <div
          key={svc.id}
          data-service-name={svc.name.toLowerCase()}
          className="may5-card"
          style={{ padding: 12, marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}
        >
          <div style={{ flex: 1 }}>
            <Link to={`/service/${svc.id}`}>
              <strong>{svc.name}</strong>
            </Link>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--may5-muted)' }}>
              {formatINR(svc.price)} · {Math.floor(svc.durationMin / 60)}h {svc.durationMin % 60}m
            </p>
            {svc.description && <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>{svc.description}</p>}
          </div>
          <Link to={`/booking/new/${svc.id}`} className="may5-btn may5-btn-primary" style={{ minHeight: 36, padding: '0 16px' }}>
            BOOK
          </Link>
        </div>
      ))}
    </section>
  )
}
