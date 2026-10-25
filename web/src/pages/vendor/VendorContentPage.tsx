import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import {
  createVendorContent,
  deleteVendorContent,
  loadVendorContent,
  loadVendorServices,
  updateVendorContent,
  type VendorService,
} from '../../lib/api'
import type { VendorContent } from '../../lib/types'
import { formatINR } from '../../lib/format'

const titles = {
  package: 'Packages',
  portfolio: 'Portfolio',
  promotion: 'Promotions',
} as const

export function VendorContentPage({ kind: kindProp }: { kind?: string }) {
  const { kind: routeKindParam = '' } = useParams()
  const routeKind = kindProp ?? routeKindParam
  const kind = routeKind === 'packages' ? 'package' : routeKind === 'portfolio' ? 'portfolio' : 'promotion'
  const title = titles[kind]
  const [items, setItems] = useState<VendorContent[]>([])
  const [services, setServices] = useState<VendorService[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [titleInput, setTitleInput] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [price, setPrice] = useState('')
  const [discount, setDiscount] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([loadVendorContent(kind), loadVendorServices()])
      .then(([content, vendorServices]) => {
        if (!active) return
        setItems(content)
        setServices(vendorServices)
      })
      .catch((err: unknown) => {
        console.error(`Could not load business ${title.toLowerCase()}:`, err)
        if (active) setError(err instanceof Error ? err.message : `Could not load ${title.toLowerCase()}.`)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [kind, title])

  async function selectImage(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPEG, PNG, or WebP image up to 5 MB.')
      return
    }
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read image'))
        reader.onerror = () => reject(reader.error ?? new Error('Could not read image'))
        reader.readAsDataURL(file)
      })
      setImageUrl(data)
      setError('')
    } catch (err) {
      console.error('Could not read business image:', err)
      setError(err instanceof Error ? err.message : 'Could not read image.')
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (kind === 'package' && serviceIds.length === 0) {
      setError('Choose at least one service to include in the package.')
      return
    }
    if (kind === 'portfolio' && !imageUrl) {
      setError('Add a photo to your portfolio entry.')
      return
    }
    if (kind === 'package' && (!price || !Number.isFinite(Number(price)) || Number(price) <= 0)) {
      setError('Enter a package price greater than zero.')
      return
    }
    if (kind === 'promotion' && startsAt && endsAt && endsAt < startsAt) {
      setError('The promotion end date must be on or after its start date.')
      return
    }
    setSaving(true)
    try {
      const created = await createVendorContent({
        kind,
        title: titleInput.trim(),
        description: description.trim(),
        imageUrl,
        serviceIds: kind === 'package' ? serviceIds : [],
        price: kind === 'package' && price ? Number(price) : null,
        discountPercent: kind === 'promotion' && discount ? Number(discount) : null,
        startsAt: startsAt || '',
        endsAt: endsAt || '',
        active: true,
      })
      setItems((current) => [created, ...current])
      setTitleInput('')
      setDescription('')
      setImageUrl('')
      setServiceIds([])
      setPrice('')
      setDiscount('')
      setStartsAt('')
      setEndsAt('')
      setSuccess(`${title} item added.`)
    } catch (err) {
      console.error(`Could not save ${kind}:`, err)
      setError(err instanceof Error ? err.message : `Could not save ${kind}.`)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(item: VendorContent) {
    setError('')
    try {
      const updated = await updateVendorContent(item.id, { active: !item.active })
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry))
    } catch (err) {
      console.error('Could not update business content:', err)
      setError(err instanceof Error ? err.message : 'Could not update item.')
    }
  }

  async function remove(item: VendorContent) {
    if (!window.confirm(`Delete "${item.title}"?`)) return
    setError('')
    try {
      await deleteVendorContent(item.id)
      setItems((current) => current.filter((entry) => entry.id !== item.id))
    } catch (err) {
      console.error('Could not delete business content:', err)
      setError(err instanceof Error ? err.message : 'Could not delete item.')
    }
  }

  return (
    <>
      <h1>{title}</h1>
      <p style={{ color: 'var(--may5-muted)' }}>
        {kind === 'package' && 'Bundle services together for bridal bookings and special occasions.'}
        {kind === 'portfolio' && 'Showcase your work with photos customers can browse.'}
        {kind === 'promotion' && 'Create offers for your listing. Only message customers who have opted in.'}
      </p>
      <section className="may5-card" style={{ padding: 16, margin: '16px 0' }}>
        <h2>Add {kind === 'package' ? 'a package' : kind === 'portfolio' ? 'a portfolio photo' : 'a promotion'}</h2>
        <form onSubmit={(event) => void submit(event)} style={{ display: 'grid', gap: 10 }}>
          <label htmlFor="vendor-content-title">Name</label>
          <input id="vendor-content-title" className="may5-input" value={titleInput} onChange={(event) => setTitleInput(event.target.value)} maxLength={120} required />
          <label htmlFor="vendor-content-description">Description</label>
          <textarea id="vendor-content-description" className="may5-input" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={3} />
          {kind !== 'package' && (
            <>
              <label htmlFor="vendor-content-image">Photo</label>
              <input id="vendor-content-image" className="may5-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void selectImage(event.target.files?.[0])} />
              {imageUrl && <img src={imageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 10 }} />}
            </>
          )}
          {kind === 'package' && (
            <>
              <fieldset style={{ border: 0, padding: 0 }}>
                <legend>Included services</legend>
                {services.length === 0 && <p style={{ color: 'var(--may5-muted)' }}>Add services before creating a package.</p>}
                <div style={{ display: 'grid', gap: 8 }}>
                  {services.map((service) => (
                    <label key={service.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="checkbox" checked={serviceIds.includes(service.id)} onChange={(event) => setServiceIds((current) => event.target.checked ? [...current, service.id] : current.filter((id) => id !== service.id))} />
                      {service.name} · {formatINR(service.price)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label htmlFor="vendor-package-price">Package price (₹)</label>
              <input id="vendor-package-price" className="may5-input" type="number" min={1} max={1000000} step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required />
            </>
          )}
          {kind === 'promotion' && (
            <>
              <label htmlFor="vendor-promotion-discount">Discount (%)</label>
              <input id="vendor-promotion-discount" className="may5-input" type="number" min={1} max={100} step={1} value={discount} onChange={(event) => setDiscount(event.target.value)} required />
              <div className="business-coordinate-row">
                <label>Starts<input className="may5-input" type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
                <label>Ends<input className="may5-input" type="date" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label>
              </div>
            </>
          )}
          {error && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{error}</p>}
          {success && <p role="status" style={{ color: 'var(--may5-success)' }}>{success}</p>}
          <button className="may5-btn may5-btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Add'}
          </button>
        </form>
      </section>
      <h2>Your {title.toLowerCase()}</h2>
      {loading && <p role="status">Loading…</p>}
      {!loading && !items.length && <p style={{ color: 'var(--may5-muted)' }}>No {title.toLowerCase()} yet.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {items.map((item) => (
          <article key={item.id} className="may5-card" style={{ padding: 14 }}>
            {item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8 }} />}
            <h3>{item.title}</h3>
            {item.description && <p>{item.description}</p>}
            {item.price !== null && <p>{formatINR(item.price)}</p>}
            {item.discountPercent !== null && <p>{item.discountPercent}% off{item.endsAt ? ` · Until ${item.endsAt}` : ''}</p>}
            {kind === 'package' && <p>{item.serviceIds.map((id) => services.find((service) => service.id === id)?.name ?? 'Service').join(' · ')}</p>}
            <p className="may5-tag">{item.active ? 'Active' : 'Paused'}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="may5-btn" onClick={() => void toggleActive(item)}>{item.active ? 'Pause' : 'Activate'}</button>
              <button type="button" className="may5-btn" onClick={() => void remove(item)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
