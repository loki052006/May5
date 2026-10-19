import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowLeft, Heart, Share2 } from 'lucide-react'
import { salons, services } from '../../lib/mockData'
import { getState, subscribe } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { formatINR } from '../../lib/format'

export function SalonDetailPage() {
  const { id } = useParams()
  const [, tick] = useState(0)
  const [favoriteError, setFavoriteError] = useState('')
  const { toggleFavorite } = useAuth()
  useEffect(() => subscribe(() => tick((n) => n + 1)), [])
  const salon = salons.find((s) => s.id === id)
  if (!salon) return <p className="may5-page-pad">Salon not found</p>

  const salonId = salon.id
  const list = services.filter((s) => s.salonId === salon.id)
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
        <div className="may5-search">
          <input placeholder="Search services..." />
        </div>

        <Section title="Popular Services" items={popular} />
        <Section title="Other Services" items={other} />
      </div>
    </>
  )
}

function Section({ title, items }: { title: string; items: typeof services }) {
  return (
    <section style={{ marginTop: 20 }}>
      <h2 style={{ fontSize: '1rem' }}>{title}</h2>
      {items.map((svc) => (
        <div key={svc.id} className="may5-card" style={{ padding: 12, marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <Link to={`/service/${svc.id}`}>
              <strong>{svc.name}</strong>
            </Link>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--may5-muted)' }}>
              {formatINR(svc.price)} · {Math.floor(svc.durationMin / 60)}h {svc.durationMin % 60}m
            </p>
          </div>
          <Link to={`/booking/new/${svc.id}`} className="may5-btn may5-btn-primary" style={{ minHeight: 36, padding: '0 16px' }}>
            BOOK
          </Link>
        </div>
      ))}
    </section>
  )
}
