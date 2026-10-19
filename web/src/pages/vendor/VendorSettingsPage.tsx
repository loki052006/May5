import { useEffect, useState, type FormEvent } from 'react'
import {
  createVendorBranch,
  loadVendorBranches,
  updateVendorBranch,
} from '../../lib/api'
import { getState, store, subscribe } from '../../lib/store'
import type { Branch } from '../../lib/types'
import { useAuth } from '../../lib/auth'

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
  const branch = branches.find((item) => item.id === branchId)

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

  return (
    <>
      <h1>Settings</h1>
      <section className="may5-card" style={{ padding: 16, marginTop: 16 }}>
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
