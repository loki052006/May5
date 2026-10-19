import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { salons } from '../../lib/mockData'
import { createVendorService } from '../../lib/api'
import { formatINR } from '../../lib/format'
import { useAuth } from '../../lib/auth'

const maxImageBytes = 5 * 1024 * 1024

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read the selected image.'))
        return
      }
      resolve(reader.result)
    }
    reader.onerror = () => reject(new Error('Could not read the selected image.'))
    reader.readAsDataURL(file)
  })
}

export function AddServicePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [salonId, setSalonId] = useState(salons[0]?.id ?? '')
  const [price, setPrice] = useState('')
  const [durationMin, setDurationMin] = useState('')
  const [category, setCategory] = useState<'popular' | 'other'>('popular')
  const [homeService, setHomeService] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function onImageChange(file?: File) {
    setError('')
    if (!file) {
      setImageFile(null)
      setImagePreview('')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > maxImageBytes) {
      setError('The service image must be 5 MB or smaller.')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (user?.authProvider !== 'google' && user?.authProvider !== 'demo') {
      setError('Sign in to a business account to save services.')
      return
    }
    if (!imageFile) {
      setError('A service image is required.')
      return
    }

    setSaving(true)
    try {
      const imageUrl = await readImage(imageFile)
      await createVendorService({
        salonId,
        name,
        price: Number(price),
        durationMin: Number(durationMin),
        category,
        homeService,
        imageUrl,
      })
      navigate('/vendor/services')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save service.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1>Add service</h1>
      <p style={{ color: 'var(--may5-muted)' }}>
        Add service details and upload a photo. A photo is required for every service.
      </p>
      <form onSubmit={onSubmit} style={{ maxWidth: 560 }}>
        <label htmlFor="service-name">Service name</label>
        <input
          id="service-name"
          className="may5-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          required
          style={{ marginBottom: 12 }}
        />

        <label htmlFor="service-salon">Salon</label>
        <select
          id="service-salon"
          className="may5-input"
          value={salonId}
          onChange={(event) => setSalonId(event.target.value)}
          required
          style={{ marginBottom: 12 }}
        >
          {salons.map((salon) => (
            <option key={salon.id} value={salon.id}>{salon.name}</option>
          ))}
        </select>

        <label htmlFor="service-price">Price (INR)</label>
        <input
          id="service-price"
          className="may5-input"
          type="number"
          min="1"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          required
          style={{ marginBottom: 4 }}
        />
        {price && <p style={{ margin: '0 0 12px', color: 'var(--may5-muted)' }}>{formatINR(Number(price))}</p>}

        <label htmlFor="service-duration">Duration (minutes)</label>
        <input
          id="service-duration"
          className="may5-input"
          type="number"
          min="1"
          max="1440"
          step="1"
          value={durationMin}
          onChange={(event) => setDurationMin(event.target.value)}
          required
          style={{ marginBottom: 12 }}
        />

        <label htmlFor="service-category">Category</label>
        <select
          id="service-category"
          className="may5-input"
          value={category}
          onChange={(event) => setCategory(event.target.value as 'popular' | 'other')}
          style={{ marginBottom: 12 }}
        >
          <option value="popular">Popular</option>
          <option value="other">Other</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={homeService}
            onChange={(event) => setHomeService(event.target.checked)}
          />
          Available at home
        </label>

        <label htmlFor="service-image">Service image (required, up to 5 MB)</label>
        <input
          id="service-image"
          className="may5-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={(event) => onImageChange(event.target.files?.[0])}
          style={{ marginBottom: 12 }}
        />
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Service preview"
            style={{ display: 'block', width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }}
          />
        )}

        {error && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{error}</p>}
        <button type="submit" className="may5-btn may5-btn-primary" disabled={saving || !imageFile}>
          {saving ? 'Saving…' : 'Save service'}
        </button>
        <Link to="/vendor/services" style={{ marginLeft: 12 }}>Cancel</Link>
      </form>
    </div>
  )
}
