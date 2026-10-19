import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { services as demoServices } from '../../lib/mockData'
import { loadVendorServices, type VendorService } from '../../lib/api'
import { formatINR } from '../../lib/format'
import { useAuth } from '../../lib/auth'

export function VendorServicesPage() {
  const { user } = useAuth()
  const [services, setServices] = useState<VendorService[]>([])
  const [loading, setLoading] = useState(
    user?.authProvider === 'google' || user?.authProvider === 'demo',
  )
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.authProvider !== 'google' && user?.authProvider !== 'demo') return
    let active = true
    void loadVendorServices()
      .then((items) => {
        if (active) setServices(items)
      })
      .catch((err: unknown) => {
        console.error('Could not load vendor services:', err)
        if (active) setError(err instanceof Error ? err.message : 'Could not load services.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user?.authProvider])

  return (
    <>
      <h1>Services</h1>
      <Link to="/vendor/add-service" className="may5-btn may5-btn-primary" style={{ marginBottom: 16 }}>
        Add service
      </Link>
      {loading && <p role="status">Loading services…</p>}
      {error && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{error}</p>}
      {!loading &&
        (user?.authProvider === 'google' || user?.authProvider === 'demo') &&
        services.length === 0 &&
        !error && (
        <p style={{ color: 'var(--may5-muted)' }}>No services yet. Add a service with a photo to get started.</p>
      )}
      {services.map((service) => (
        <article key={service.id} className="may5-card" style={{ padding: 12, marginBottom: 12 }}>
          <img
            src={service.imageUrl}
            alt={service.name}
            style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8 }}
          />
          <strong style={{ display: 'block', marginTop: 8 }}>{service.name}</strong>
          <p style={{ margin: '4px 0 0', color: 'var(--may5-muted)' }}>
            {formatINR(service.price)} · {service.durationMin} min {service.homeService ? '· At-home' : ''}
          </p>
        </article>
      ))}
      {user?.authProvider !== 'google' && user?.authProvider !== 'demo' && demoServices.map((service) => (
        <div key={service.id} className="may5-card" style={{ padding: 12, marginBottom: 8 }}>
          <strong>{service.name}</strong>
          <p style={{ margin: '4px 0 0', color: 'var(--may5-muted)' }}>
            {formatINR(service.price)} · {service.durationMin} min {service.homeService ? '· At-home' : ''}
          </p>
          <small>Demo listing — add a photo when creating a business service.</small>
        </div>
      ))}
    </>
  )
}
