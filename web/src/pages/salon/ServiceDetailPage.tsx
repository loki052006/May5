import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { salons, services } from '../../lib/mockData'
import { formatINR } from '../../lib/format'

export function ServiceDetailPage() {
  const { id } = useParams()
  const svc = services.find((s) => s.id === id)
  const salon = salons.find((s) => s.id === svc?.salonId)
  if (!svc || !salon) return <p className="may5-page-pad">Service not found</p>

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
        <p>
          {formatINR(svc.price)} · {svc.durationMin} min
        </p>
        {svc.imageUrl && (
          <img src={svc.imageUrl} alt={svc.name} style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 12 }} />
        )}
        {svc.homeService && <span className="may5-tag">Mobile / at-home available</span>}
        <p style={{ marginTop: 16 }}>Professional service at this MAY5 partner salon.</p>
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
