import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { store } from '../../lib/store'
import { updateGoogleProfile } from '../../lib/api'

export function EditProfilePage() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [age, setAge] = useState(String(user?.age ?? ''))
  const [gender, setGender] = useState(user?.gender ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function onPhotoChange(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP photo.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Choose a photo smaller than 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result)
        setError('')
      }
    }
    reader.onerror = () => setError('Could not read the selected photo.')
    reader.readAsDataURL(file)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const patch = {
      fullName,
      phone: phone.trim(),
      age: age ? Number(age) : undefined,
      gender: gender || undefined,
      avatarUrl: avatarUrl || null,
    }
    try {
      if (user?.authProvider === 'google' || user?.authProvider === 'demo') {
        await updateGoogleProfile(patch)
      }
      store.updateProfile(patch)
      refresh()
      navigate('/customer/profile')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="may5-page-pad">
      <h1>Edit profile</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="profile-photo">Profile photo</label>
        <input
          id="profile-photo"
          className="may5-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          onChange={(event) => void onPhotoChange(event.target.files?.[0])}
          style={{ margin: '8px 0 12px', padding: 8 }}
        />
        {avatarUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <img src={avatarUrl} alt="Selected profile" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
            <button type="button" className="may5-btn may5-btn-secondary" onClick={() => setAvatarUrl('')}>
              Remove photo
            </button>
          </div>
        )}
        <label>Name</label>
        <input className="may5-input" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ marginBottom: 12 }} />
        <label htmlFor="profile-phone">Mobile number</label>
        <input
          id="profile-phone"
          className="may5-input"
          type="tel"
          inputMode="tel"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <p style={{ marginTop: -8, color: 'var(--may5-muted)', fontSize: '0.8rem' }}>
          Use a 10-digit Indian mobile number. Leave blank if you prefer not to share it.
        </p>
        <label htmlFor="profile-age">Age</label>
        <input id="profile-age" className="may5-input" type="number" min={13} max={120} value={age} onChange={(e) => setAge(e.target.value)} style={{ marginBottom: 12 }} />
        <label>Gender</label>
        <select className="may5-input" value={gender} onChange={(e) => setGender(e.target.value)} style={{ marginBottom: 16 }}>
          <option value="">Prefer not to say</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="non_binary">Non-binary</option>
        </select>
        {error && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{error}</p>}
        <button type="submit" className="may5-btn may5-btn-primary" style={{ width: '100%' }} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
      <Link to="/customer/profile" style={{ display: 'inline-block', marginTop: 16 }}>
        Cancel
      </Link>
    </div>
  )
}
