import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createVendorService, loadVendorBusinessProfile } from '../../lib/api'
import { formatINR } from '../../lib/format'
import { useAuth } from '../../lib/auth'

const maxImageBytes = 5 * 1024 * 1024
const maxServiceImages = 5

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
  const [description, setDescription] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [profileLoading, setProfileLoading] = useState(true)
  const [price, setPrice] = useState('')
  const [durationMin, setDurationMin] = useState('')
  const [category, setCategory] = useState<'popular' | 'other'>('popular')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const imagePreviewUrls = useRef<string[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => () => {
    imagePreviewUrls.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  useEffect(() => {
    let active = true
    void loadVendorBusinessProfile()
      .then((profile) => {
        if (active) {
          setBusinessName(profile.businessName)
          setBusinessId(profile.id)
        }
      })
      .catch((err: unknown) => {
        console.error('Could not load business profile before adding service:', err)
        if (active) setError(err instanceof Error ? err.message : 'Save your business details before adding services.')
      })
      .finally(() => {
        if (active) setProfileLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  function onImageChange(files: FileList | null, input: HTMLInputElement) {
    const selectedFiles = Array.from(files ?? [])
    input.value = ''
    if (selectedFiles.length === 0) {
      return
    }
    if (imageFiles.length + selectedFiles.length > maxServiceImages) {
      setError(`You can upload up to ${maxServiceImages} images for each service.`)
      return
    }
    if (selectedFiles.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      setError('Choose a JPEG, PNG, or WebP image.')
      return
    }
    if (selectedFiles.some((file) => file.size > maxImageBytes)) {
      setError('Each service image must be 5 MB or smaller.')
      return
    }
    const previews = selectedFiles.map((file) => URL.createObjectURL(file))
    imagePreviewUrls.current.push(...previews)
    setImageFiles((current) => [...current, ...selectedFiles])
    setImagePreviews((current) => [...current, ...previews])
    setError('')
  }

  function removeImage(index: number) {
    const preview = imagePreviews[index]
    URL.revokeObjectURL(preview)
    imagePreviewUrls.current = imagePreviewUrls.current.filter((url) => url !== preview)
    setImageFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))
    setImagePreviews((current) => current.filter((_, previewIndex) => previewIndex !== index))
    setError('')
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (user?.authProvider !== 'google' && user?.authProvider !== 'demo') {
      setError('Sign in to a business account to save services.')
      return
    }
    if (!businessName.trim()) {
      setError('Save your business name and store location before adding services.')
      return
    }
    if (imageFiles.length === 0) {
      setError('At least one service image is required.')
      return
    }

    setSaving(true)
    try {
      const imageUrls = await Promise.all(imageFiles.map(readImage))
      await createVendorService({
        salonId: businessId,
        name,
        description,
        price: Number(price),
        durationMin: Number(durationMin),
        category,
        homeService: false,
        imageUrls,
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
        Add service details and upload up to {maxServiceImages} photos. At least one photo is required.
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

        <p style={{ color: 'var(--may5-muted)' }}>
          Listing under: <strong>{profileLoading ? 'Loading business profile…' : businessName || 'Business details not set'}</strong>
          {!profileLoading && !businessName && <> · <Link to="/vendor/settings">Complete your business profile</Link></>}
        </p>

        <label htmlFor="service-description">Service details</label>
        <textarea
          id="service-description"
          className="may5-input"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={500}
          rows={3}
          style={{ marginBottom: 12 }}
          placeholder="Describe what's included in this service"
        />

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

        <label htmlFor="service-image">Service images (up to {maxServiceImages}, 5 MB each)</label>
        <input
          id="service-image"
          className="may5-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={imageFiles.length >= maxServiceImages}
          onChange={(event) => onImageChange(event.target.files, event.currentTarget)}
          style={{ marginBottom: 12 }}
        />
        <p style={{ margin: '0 0 12px', color: 'var(--may5-muted)' }}>
          {imageFiles.length} of {maxServiceImages} images selected. Select more to add them.
        </p>
        {imagePreviews.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 16 }}>
            {imagePreviews.map((preview, index) => (
              <div key={preview}>
                <img
                  src={preview}
                  alt={`Service image ${index + 1}`}
                  style={{ display: 'block', width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }}
                />
                <button type="button" className="may5-btn" onClick={() => removeImage(index)} style={{ marginTop: 4 }}>
                  Remove image {index + 1}
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{error}</p>}
        <button type="submit" className="may5-btn may5-btn-primary" disabled={saving || profileLoading || !businessName || !businessId || imageFiles.length === 0}>
          {saving ? 'Saving…' : 'Save service'}
        </button>
        <Link to="/vendor/services" style={{ marginLeft: 12 }}>Cancel</Link>
      </form>
    </div>
  )
}
