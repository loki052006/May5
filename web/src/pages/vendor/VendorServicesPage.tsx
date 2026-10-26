import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { services as demoServices } from '../../lib/mockData'
import { loadVendorServices, updateVendorService, type VendorService } from '../../lib/api'
import { formatINR } from '../../lib/format'
import { useAuth } from '../../lib/auth'

type ServiceEdit = Pick<VendorService, 'name' | 'description' | 'price' | 'durationMin'>

export function VendorServicesPage() {
  const { user } = useAuth()
  const [services, setServices] = useState<VendorService[]>([])
  const [loading, setLoading] = useState(user?.authProvider === 'google' || user?.authProvider === 'demo')
  const [savingId, setSavingId] = useState('')
  const [editingId, setEditingId] = useState('')
  const [edit, setEdit] = useState<ServiceEdit | null>(null)
  const [error, setError] = useState('')
  const remote = user?.authProvider === 'google' || user?.authProvider === 'demo'

  useEffect(() => {
    if (!remote) return
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
  }, [remote])

  function beginEdit(service: VendorService) {
    setEditingId(service.id)
    setEdit({
      name: service.name,
      description: service.description ?? '',
      price: service.price,
      durationMin: service.durationMin,
    })
    setError('')
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!edit || !editingId) return
    setError('')
    setSavingId(editingId)
    try {
      const updated = await updateVendorService(editingId, edit)
      setServices((items) => items.map((item) => item.id === updated.id ? updated : item))
      setEditingId('')
      setEdit(null)
    } catch (err) {
      console.error('Could not save service changes:', err)
      setError(err instanceof Error ? err.message : 'Could not save service changes.')
    } finally {
      setSavingId('')
    }
  }

  async function toggleActive(service: VendorService) {
    setError('')
    setSavingId(service.id)
    try {
      const updated = await updateVendorService(service.id, { active: !service.active })
      setServices((items) => items.map((item) => item.id === updated.id ? updated : item))
    } catch (err) {
      console.error('Could not update service status:', err)
      setError(err instanceof Error ? err.message : 'Could not update service status.')
    } finally {
      setSavingId('')
    }
  }

  return (
    <>
      <h1>Services</h1>
      <Link to="/vendor/add-service" className="may5-btn may5-btn-primary" style={{ marginBottom: 16 }}>
        Add service
      </Link>
      {loading && <p role="status">Loading services…</p>}
      {error && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{error}</p>}
      {!loading && remote && services.length === 0 && !error && (
        <p style={{ color: 'var(--may5-muted)' }}>No services yet. Add a service with a photo to get started.</p>
      )}
      {services.map((service) => (
        <article key={service.id} className="may5-card" style={{ padding: 12, marginBottom: 12 }}>
          {service.imageUrl && (
            <img src={service.imageUrl} alt={service.name} style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8 }} />
          )}
          {editingId === service.id && edit ? (
            <form onSubmit={(event) => void saveEdit(event)} style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              <label htmlFor={`service-name-${service.id}`}>Service name</label>
              <input id={`service-name-${service.id}`} className="may5-input" value={edit.name} onChange={(event) => setEdit({ ...edit, name: event.target.value })} maxLength={120} required />
              <label htmlFor={`service-description-${service.id}`}>Description</label>
              <textarea id={`service-description-${service.id}`} className="may5-input" value={edit.description} onChange={(event) => setEdit({ ...edit, description: event.target.value })} maxLength={500} rows={3} />
              <div className="business-coordinate-row">
                <label>Price (₹)<input className="may5-input" type="number" min={1} max={1000000} step="0.01" value={edit.price} onChange={(event) => setEdit({ ...edit, price: Number(event.target.value) })} required /></label>
                <label>Duration (minutes)<input className="may5-input" type="number" min={1} max={1440} value={edit.durationMin} onChange={(event) => setEdit({ ...edit, durationMin: Number(event.target.value) })} required /></label>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="may5-btn may5-btn-primary" type="submit" disabled={savingId === service.id}>{savingId === service.id ? 'Saving…' : 'Save changes'}</button>
                <button className="may5-btn" type="button" onClick={() => { setEditingId(''); setEdit(null) }}>Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <div>
                  <strong>{service.name}</strong>
                  <p style={{ margin: '4px 0 0', color: 'var(--may5-muted)' }}>
                    {formatINR(service.price)} · {service.durationMin} min
                  </p>
                </div>
                <span className="may5-tag">{service.active ? 'Active' : 'Paused'}</span>
              </div>
              {service.description && <p style={{ color: 'var(--may5-muted)' }}>{service.description}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" className="may5-btn" disabled={savingId === service.id} onClick={() => void toggleActive(service)}>{service.active ? 'Pause' : 'Activate'}</button>
                <button type="button" className="may5-btn" aria-label={`Edit ${service.name}`} onClick={() => beginEdit(service)}><Pencil size={16} /> Edit</button>
              </div>
            </>
          )}
        </article>
      ))}
      {!remote && demoServices.map((service) => (
        <div key={service.id} className="may5-card" style={{ padding: 12, marginBottom: 8 }}>
          <strong>{service.name}</strong>
          <p style={{ margin: '4px 0 0', color: 'var(--may5-muted)' }}>
            {formatINR(service.price)} · {service.durationMin} min
          </p>
          <small>Demo listing — add a photo when creating a business service.</small>
        </div>
      ))}
    </>
  )
}
