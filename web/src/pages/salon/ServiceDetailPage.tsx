import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { formatINR } from '../../lib/format'
import { usePublicCatalog } from '../../lib/usePublicCatalog'

export function ServiceDetailPage() {
  const { id } = useParams()
  const { salons, services, loading, error } = usePublicCatalog()
  const svc = services.find((s) => s.id === id)
  const salon = salons.find((s) => s.id === svc?.salonId)
  if (!svc || !salon) {
    if (loading) return <p className="may5-page-pad" role="status">Loading service…</p>
    return <p className="may5-page-pad">{error || 'Service not found'}</p>
  }

  return (
    <>
      <header className="may5-header-mobile">
        <div className="may5-header-row">
          <Link to={`/salon/${salon.id}`} style={{ color: '#fff' }}>
            <ArrowLeft />
          </Link>
          <h1>{svc.name}</h1>
          <span />
        </div>
      </header>
      <div className="may5-page-pad">
        <p style={{ color: 'var(--may5-muted)' }}>{salon.name}</p>
        {salon.demoListing && <p className="may5-tag" role="status">Illustrative demo service — it is not redeemable. Checkout will charge real money.</p>}
        <p>
          {formatINR(svc.price)} · {svc.durationMin} min
        </p>
        <p style={{ color: 'var(--may5-muted)' }}>Store: {salon.name} · {salon.address}</p>
        {svc.description && <p>{svc.description}</p>}
        {svc.imageUrl && (
          <img src={svc.imageUrl} alt={svc.name} style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 12 }} />
        )}
        {salon.description && <p style={{ marginTop: 16 }}>{salon.description}</p>}
        <Link
          to={`/booking/new/${svc.id}`}
          className="may5-btn may5-btn-primary"
          style={{ display: 'block', textAlign: 'center', marginTop: 24 }}
        >
          Book now
        </Link>
      </div>
    </>
  )
}
