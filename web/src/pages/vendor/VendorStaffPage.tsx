import { useEffect, useState, type FormEvent } from 'react'
import { salons } from '../../lib/mockData'
import {
  createVendorStaff,
  deleteVendorStaff,
  loadVendorStaff,
  updateVendorStaff,
} from '../../lib/api'
import type { VendorStaff } from '../../lib/types'
import { useAuth } from '../../lib/auth'

type StaffForm = Omit<VendorStaff, 'id' | 'active'>

const emptyForm: StaffForm = {
  salonId: salons[0]?.id ?? '',
  fullName: '',
  position: '',
  phone: '',
  email: '',
}

export function VendorStaffPage() {
  const { user } = useAuth()
  const [team, setTeam] = useState<VendorStaff[]>([])
  const [loading, setLoading] = useState(
    user?.authProvider === 'google' || user?.authProvider === 'demo',
  )
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<StaffForm>(emptyForm)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.authProvider !== 'google' && user?.authProvider !== 'demo') {
      return
    }

    let active = true
    void loadVendorStaff()
      .then((items) => {
        if (active) setTeam(items)
      })
      .catch((err: unknown) => {
        console.error('Could not load vendor staff:', err)
        if (active) setError(err instanceof Error ? err.message : 'Could not load staff.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user?.authProvider])

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
  }

  function beginEdit(member: VendorStaff) {
    setForm({
      salonId: member.salonId,
      fullName: member.fullName,
      position: member.position,
      phone: member.phone,
      email: member.email,
    })
    setEditingId(member.id)
    setError('')
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (editingId) {
        const updated = await updateVendorStaff(editingId, form)
        setTeam((members) => members.map((member) => member.id === updated.id ? updated : member))
      } else {
        const created = await createVendorStaff(form)
        setTeam((members) => [created, ...members])
      }
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save staff member.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(member: VendorStaff) {
    setError('')
    try {
      const updated = await updateVendorStaff(member.id, { active: !member.active })
      setTeam((members) => members.map((item) => item.id === updated.id ? updated : item))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update staff status.')
    }
  }

  async function removeMember(member: VendorStaff) {
    if (!window.confirm(`Remove ${member.fullName} from your team?`)) return
    setError('')
    try {
      await deleteVendorStaff(member.id)
      setTeam((members) => members.filter((item) => item.id !== member.id))
      if (editingId === member.id) resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove staff member.')
    }
  }

  return (
    <>
      <h1>Staff management</h1>
      <p style={{ color: 'var(--may5-muted)', marginBottom: 16 }}>
        Add team members, manage their contact details, and control who is currently active.
      </p>

      <section className="may5-card" style={{ padding: 16, marginBottom: 20 }}>
        <h2>{editingId ? 'Edit staff member' : 'Add a team member'}</h2>
        <form onSubmit={onSubmit} style={{ maxWidth: 560, margin: '16px auto 0', textAlign: 'left' }}>
          <label htmlFor="staff-name">Full name</label>
          <input
            id="staff-name"
            className="may5-input"
            value={form.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            maxLength={120}
            required
            style={{ marginBottom: 12 }}
          />

          <label htmlFor="staff-position">Role or specialty</label>
          <input
            id="staff-position"
            className="may5-input"
            placeholder="e.g. Hair stylist"
            value={form.position}
            onChange={(event) => setForm({ ...form, position: event.target.value })}
            maxLength={80}
            required
            style={{ marginBottom: 12 }}
          />

          <label htmlFor="staff-salon">Salon</label>
          <select
            id="staff-salon"
            className="may5-input"
            value={form.salonId}
            onChange={(event) => setForm({ ...form, salonId: event.target.value })}
            required
            style={{ marginBottom: 12 }}
          >
            {salons.map((salon) => (
              <option key={salon.id} value={salon.id}>{salon.name}</option>
            ))}
          </select>

          <label htmlFor="staff-phone">Mobile number (optional)</label>
          <input
            id="staff-phone"
            className="may5-input"
            type="tel"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            style={{ marginBottom: 12 }}
          />

          <label htmlFor="staff-email">Email (optional)</label>
          <input
            id="staff-email"
            className="may5-input"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            maxLength={254}
            style={{ marginBottom: 16 }}
          />

          {error && <p role="alert" style={{ color: 'var(--may5-danger)', marginBottom: 12 }}>{error}</p>}
          <button type="submit" className="may5-btn may5-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add staff member'}
          </button>
          {editingId && (
            <button type="button" className="may5-btn" onClick={resetForm} style={{ marginLeft: 8 }}>
              Cancel
            </button>
          )}
        </form>
      </section>

      <h2 style={{ marginBottom: 12 }}>Your team</h2>
      {loading && <p role="status">Loading staff…</p>}
      {error && !editingId && <p role="alert" style={{ color: 'var(--may5-danger)', marginBottom: 12 }}>{error}</p>}
      {!loading && !error && team.length === 0 && (
        <p style={{ color: 'var(--may5-muted)' }}>No team members yet. Add your first staff member above.</p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {team.map((member) => (
          <article key={member.id} className="may5-card" style={{ padding: 16, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }}>
              <div>
                <strong>{member.fullName}</strong>
                <p style={{ color: 'var(--may5-muted)' }}>{member.position}</p>
              </div>
              <span className="may5-tag">{member.active ? 'Active' : 'Inactive'}</span>
            </div>
            <p style={{ marginTop: 8, fontSize: '0.9rem' }}>
              {salons.find((salon) => salon.id === member.salonId)?.name ?? 'Salon'}
            </p>
            {member.phone && <p style={{ fontSize: '0.9rem' }}>{member.phone}</p>}
            {member.email && <p style={{ fontSize: '0.9rem' }}>{member.email}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <button type="button" className="may5-btn" onClick={() => beginEdit(member)}>Edit</button>
              <button type="button" className="may5-btn" onClick={() => void toggleActive(member)}>
                {member.active ? 'Deactivate' : 'Activate'}
              </button>
              <button type="button" className="may5-btn" onClick={() => void removeMember(member)}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
