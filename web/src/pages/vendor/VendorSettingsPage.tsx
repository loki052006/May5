import { useEffect, useState, type FormEvent } from 'react'
import {
  createVendorBranch,
  loadVendorBusinessProfile,
  loadVendorBranches,
  saveVendorBusinessProfile,
  updateVendorBranch,
} from '../../lib/api'
import { getState, store, subscribe } from '../../lib/store'
import type { Branch, VendorBusinessProfile } from '../../lib/types'
import { useAuth } from '../../lib/auth'

const emptyProfile: VendorBusinessProfile = {
  id: '',
  businessName: '',
  businessType: '',
  description: '',
  address: '',
  locality: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  email: '',
  website: '',
  openingHours: '',
  openingDays: [1, 2, 3, 4, 5, 6],
  openingTime: '09:00',
  closingTime: '18:00',
  amenities: [],
  shopPhoto: '',
  targetAudience: 'unisex',
  lat: null,
  lng: null,
}

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const amenityOptions = [
  'Free WiFi',
  'Parking',
  'Air conditioning',
  'Wheelchair accessible',
  'Card payment',
  'Waiting area',
  'Refreshments',
  'Kids friendly',
  'Music',
  'Home service',
]

export function VendorSettingsPage() {
  const { user } = useAuth()
  const remote = user?.authProvider === 'google' || user?.authProvider === 'demo'
  const [, tick] = useState(0)
  const [branches, setBranches] = useState<Branch[]>(() => remote ? [] : getState().vendorBranches)
  const initialBranch = branches[0]
  const [branchId, setBranchId] = useState(initialBranch?.id ?? '')
  const [name, setName] = useState(initialBranch?.name ?? '')
  const [address, setAddress] = useState(initialBranch?.address ?? '')
  const [seats, setSeats] = useState(initialBranch?.seatCapacity ?? 1)
  const [servicesPerHour, setServicesPerHour] = useState(initialBranch?.serviceCapacityPerHour ?? 1)
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<VendorBusinessProfile>(emptyProfile)
  const [profileLoading, setProfileLoading] = useState(remote)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)
  const branch = branches.find((item) => item.id === branchId)

  useEffect(() => {
    if (!remote) return
    let active = true
    void loadVendorBusinessProfile()
      .then((item) => {
        if (active) setProfile(item)
      })
      .catch((err: unknown) => {
        console.error('Could not load business details:', err)
        if (active) setProfileError(err instanceof Error ? err.message : 'Could not load business details.')
      })
      .finally(() => {
        if (active) setProfileLoading(false)
      })
    return () => {
      active = false
    }
  }, [remote])

  useEffect(() => {
    if (!remote) return
    let active = true
    void loadVendorBranches()
      .then((items) => {
        if (!active) return
        setBranches(items)
        setBranchId(items[0]?.id ?? '')
        setName(items[0]?.name ?? '')
        setAddress(items[0]?.address ?? '')
        setSeats(items[0]?.seatCapacity ?? 1)
        setServicesPerHour(items[0]?.serviceCapacityPerHour ?? 1)
        setError('')
      })
      .catch((err: unknown) => {
        console.error('Could not load stores:', err)
        if (active) setError(err instanceof Error ? err.message : 'Could not load stores.')
      })
    return () => {
      active = false
    }
  }, [remote])

  useEffect(() => subscribe(() => tick((n) => n + 1)), [])

  function selectBranch(id: string) {
    setBranchId(id)
    const selected = branches.find((item) => item.id === id)
    if (!selected) return
    setName(selected.name)
    setAddress(selected.address)
    setSeats(selected.seatCapacity)
    setServicesPerHour(selected.serviceCapacityPerHour)
  }

  async function addBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    const details = {
      name: newName.trim(),
      address: newAddress.trim(),
      seatCapacity: 1,
      serviceCapacityPerHour: 1,
    }
    try {
      const created = remote
        ? await createVendorBranch(details)
        : (() => {
            store.addVendorBranch(details)
            return getState().vendorBranches.at(-1)!
          })()
      setBranches((items) => [...items, created])
      setBranchId(created.id)
      setName(created.name)
      setAddress(created.address)
      setSeats(created.seatCapacity)
      setServicesPerHour(created.serviceCapacityPerHour)
      setNewName('')
      setNewAddress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add store.')
    } finally {
      setSaving(false)
    }
  }

  async function saveBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!branch) return
    const patch = {
      name: name.trim(),
      address: address.trim(),
      seatCapacity: Number(seats),
      serviceCapacityPerHour: Number(servicesPerHour),
    }
    if (
      !patch.name || !patch.address ||
      !Number.isInteger(patch.seatCapacity) || patch.seatCapacity < 1 || patch.seatCapacity > 500 ||
      !Number.isInteger(patch.serviceCapacityPerHour) || patch.serviceCapacityPerHour < 1 || patch.serviceCapacityPerHour > 500
    ) {
      setError('Enter a store name, address, and capacity values from 1 to 500.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const updated = remote
        ? await updateVendorBranch(branch.id, patch)
        : (() => {
            store.updateVendorBranch(branch.id, patch)
            return { ...branch, ...patch }
          })()
      setBranches((items) => items.map((item) => item.id === updated.id ? updated : item))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save store settings.')
    } finally {
      setSaving(false)
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileError('')
    setProfileSaved(false)
    setProfileSaving(true)
    try {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const nextProfile = {
        ...profile,
        openingHours: profile.openingDays.length && profile.openingTime && profile.closingTime
          ? `${profile.openingDays.map((day) => dayNames[day]).join(' ')}, ${profile.openingTime}–${profile.closingTime}`
          : profile.openingHours,
      }
      const saved = remote
        ? await saveVendorBusinessProfile(nextProfile)
        : nextProfile
      setProfile(saved)
      setProfileSaved(true)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not save business details.')
    } finally {
      setProfileSaving(false)
    }
  }

  async function changeShopPhoto(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setProfileError('Choose a JPEG, PNG, or WebP image up to 5 MB.')
      return
    }
    try {
      const photo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read image'))
        reader.onerror = () => reject(reader.error ?? new Error('Could not read image'))
        reader.readAsDataURL(file)
      })
      setProfile({ ...profile, shopPhoto: photo })
      setProfileError('')
    } catch (err) {
      console.error('Could not load shop photo:', err)
      setProfileError(err instanceof Error ? err.message : 'Could not load shop photo.')
    }
  }

  function captureBusinessLocation() {
    if (!navigator.geolocation) {
      setProfileError('Location is not supported by this browser. You can enter coordinates manually.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setProfile({ ...profile, lat: Number(coords.latitude.toFixed(6)), lng: Number(coords.longitude.toFixed(6)) })
        setProfileError('')
      },
      (locationError) => {
        console.error('Could not determine business location:', locationError)
        setProfileError(locationError.code === locationError.PERMISSION_DENIED
          ? 'Allow location access to use your current store location.'
          : 'Could not determine your location. You can enter coordinates manually.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  return (
    <>
      <h1>Settings</h1>
      <section className="may5-card" style={{ padding: 16, marginTop: 16 }}>
        <h2>Business profile</h2>
        <p style={{ color: 'var(--may5-muted)' }}>
          These verified-by-you details and your service menu are shown to customers on your MAY5 listing.
        </p>
        {profileLoading ? <p role="status">Loading business details…</p> : (
          <form onSubmit={saveProfile} style={{ display: 'grid', gap: 10 }}>
            <label htmlFor="shop-photo">Shop photo</label>
            {profile.shopPhoto && (
              <img src={profile.shopPhoto} alt="Business storefront preview" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 12 }} />
            )}
            <input id="shop-photo" className="may5-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void changeShopPhoto(event.target.files?.[0])} />
            <small style={{ color: 'var(--may5-muted)' }}>Displayed on your customer listing. JPEG, PNG, or WebP up to 5 MB.</small>
            <label htmlFor="business-name">Business / store name</label>
            <input id="business-name" className="may5-input" value={profile.businessName} onChange={(event) => setProfile({ ...profile, businessName: event.target.value })} maxLength={100} required />
            <label htmlFor="business-type">Business type</label>
            <select id="business-type" className="may5-input" value={profile.businessType} onChange={(event) => setProfile({ ...profile, businessType: event.target.value })} required>
              <option value="">Choose a business type</option>
              <option>Hair salon</option>
              <option>Beauty parlour</option>
              <option>Spa & wellness</option>
              <option>Nail studio</option>
              <option>Barber shop</option>
              <option>Other beauty business</option>
            </select>
            <label htmlFor="business-address">Store location / full address</label>
            <input id="business-address" className="may5-input" value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} maxLength={240} required />
            <label htmlFor="business-locality">Area / locality</label>
            <input id="business-locality" className="may5-input" value={profile.locality} onChange={(event) => setProfile({ ...profile, locality: event.target.value })} maxLength={120} />
            <div className="business-coordinate-row">
              <label>City<input className="may5-input" value={profile.city} onChange={(event) => setProfile({ ...profile, city: event.target.value })} maxLength={100} /></label>
              <label>State<input className="may5-input" value={profile.state} onChange={(event) => setProfile({ ...profile, state: event.target.value })} maxLength={100} /></label>
            </div>
            <label htmlFor="business-pincode">PIN code</label>
            <input id="business-pincode" className="may5-input" inputMode="numeric" pattern="[0-9]{6}" value={profile.pincode} onChange={(event) => setProfile({ ...profile, pincode: event.target.value })} maxLength={6} />
            <label htmlFor="business-description">About your store and services</label>
            <textarea id="business-description" className="may5-input" value={profile.description} onChange={(event) => setProfile({ ...profile, description: event.target.value })} maxLength={800} rows={4} />
            <label htmlFor="business-phone">Business phone</label>
            <input id="business-phone" className="may5-input" type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} maxLength={24} />
            <label htmlFor="business-email">Business email</label>
            <input id="business-email" className="may5-input" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} maxLength={240} />
            <label htmlFor="business-website">Website (optional)</label>
            <input id="business-website" className="may5-input" type="url" value={profile.website} onChange={(event) => setProfile({ ...profile, website: event.target.value })} placeholder="https://example.com" maxLength={240} />
            <label htmlFor="business-hours">Opening hours</label>
            <input id="business-hours" className="may5-input" value={profile.openingHours} onChange={(event) => setProfile({ ...profile, openingHours: event.target.value })} placeholder="Mon–Sat, 10:00 AM–8:00 PM" maxLength={240} />
            <fieldset style={{ border: 0, padding: 0, display: 'grid', gap: 8 }}>
              <legend>Opening days</legend>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {weekdays.map((day, index) => (
                  <label key={day} className="may5-tag" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={profile.openingDays.includes(index)}
                      onChange={(event) => setProfile({
                        ...profile,
                        openingDays: event.target.checked
                          ? [...profile.openingDays, index].sort()
                          : profile.openingDays.filter((openDay) => openDay !== index),
                      })}
                    /> {day.slice(0, 3)}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="business-coordinate-row">
              <label htmlFor="business-opening-time">Opening time<input id="business-opening-time" className="may5-input" type="time" value={profile.openingTime} onChange={(event) => setProfile({ ...profile, openingTime: event.target.value })} /></label>
              <label htmlFor="business-closing-time">Closing time<input id="business-closing-time" className="may5-input" type="time" value={profile.closingTime} onChange={(event) => setProfile({ ...profile, closingTime: event.target.value })} /></label>
            </div>
            <label htmlFor="business-audience">Who can book services?</label>
            <select id="business-audience" className="may5-input" value={profile.targetAudience} onChange={(event) => setProfile({ ...profile, targetAudience: event.target.value as VendorBusinessProfile['targetAudience'] })}>
              <option value="unisex">Everyone</option>
              <option value="women">Women only</option>
              <option value="men">Men only</option>
            </select>
            <fieldset style={{ border: 0, padding: 0, display: 'grid', gap: 8 }}>
              <legend>Amenities</legend>
              <small style={{ color: 'var(--may5-muted)' }}>Select the amenities customers can expect at your store.</small>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {amenityOptions.map((amenity) => (
                  <label key={amenity} className="may5-tag" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={profile.amenities.includes(amenity)}
                      onChange={(event) => setProfile({
                        ...profile,
                        amenities: event.target.checked
                          ? [...profile.amenities, amenity]
                          : profile.amenities.filter((item) => item !== amenity),
                      })}
                    /> {amenity}
                  </label>
                ))}
              </div>
            </fieldset>
            <label>Store map location (latitude / longitude)</label>
            <p style={{ color: 'var(--may5-muted)', margin: 0, fontSize: '0.85rem' }}>A map pin helps customers find your store. Coordinates can be obtained from your device location or entered manually.</p>
            <div className="business-coordinate-row">
              <input className="may5-input" type="number" aria-label="Store latitude" min={-90} max={90} step="any" placeholder="Latitude" value={profile.lat ?? ''} onChange={(event) => setProfile({ ...profile, lat: event.target.value ? Number(event.target.value) : null })} />
              <input className="may5-input" type="number" aria-label="Store longitude" min={-180} max={180} step="any" placeholder="Longitude" value={profile.lng ?? ''} onChange={(event) => setProfile({ ...profile, lng: event.target.value ? Number(event.target.value) : null })} />
            </div>
            <button type="button" className="may5-btn may5-btn-secondary" onClick={captureBusinessLocation}>Use this device location</button>
            {profileError && <p role="alert" style={{ color: 'var(--may5-danger)', margin: 0 }}>{profileError}</p>}
            {profileSaved && <p role="status" style={{ color: 'var(--may5-success)', margin: 0 }}>Business details saved. Your listing is visible to customers.</p>}
            <button type="submit" className="may5-btn may5-btn-primary" disabled={profileSaving}>
              {profileSaving ? 'Saving…' : 'Save business profile'}
            </button>
          </form>
        )}
      </section>
      <section id="vendor-stores" className="may5-card" style={{ padding: 16, marginTop: 16 }}>
        <h2>Multi-store management</h2>
        {branches.length > 0 && (
          <>
            <label htmlFor="vendor-branch">Manage store</label>
            <select
              id="vendor-branch"
              className="may5-input"
              value={branchId}
              onChange={(event) => selectBranch(event.target.value)}
            >
              {branches.map((item) => (
                <option key={item.id} value={item.id}>{item.name} — {item.address}</option>
              ))}
            </select>
            {branch && (
              <form onSubmit={saveBranch} style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                <label htmlFor="branch-name">Store name</label>
                <input id="branch-name" className="may5-input" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
                <label htmlFor="branch-address">Address</label>
                <input id="branch-address" className="may5-input" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={200} required />
                <label htmlFor="branch-seats">Seats in overview</label>
                <input id="branch-seats" className="may5-input" type="number" min={1} max={500} value={seats} onChange={(event) => setSeats(Number(event.target.value))} required />
                <label htmlFor="branch-services">Max services per hour</label>
                <input id="branch-services" className="may5-input" type="number" min={1} max={500} value={servicesPerHour} onChange={(event) => setServicesPerHour(Number(event.target.value))} required />
                <button type="submit" className="may5-btn may5-btn-secondary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save store and capacity'}
                </button>
              </form>
            )}
          </>
        )}
        {branches.length === 0 && !error && <p style={{ color: 'var(--may5-muted)' }}>Add your first store to start managing locations.</p>}
        <form onSubmit={addBranch} style={{ display: 'grid', gap: 10, marginTop: 20 }}>
          <h3 style={{ margin: 0 }}>Add a store</h3>
          <input className="may5-input" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Store name" maxLength={80} required />
          <input className="may5-input" value={newAddress} onChange={(event) => setNewAddress(event.target.value)} placeholder="Address" maxLength={200} required aria-label="New store address" />
          <button type="submit" className="may5-btn may5-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Add store'}
          </button>
        </form>
        {error && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{error}</p>}
      </section>
      <section className="may5-card" style={{ padding: 16, marginTop: 16 }}>
        <h2>Video following</h2>
        <p style={{ color: 'var(--may5-muted)' }}>Customers can follow a stylist from their booking videos in booking history.</p>
      </section>
    </>
  )
}
