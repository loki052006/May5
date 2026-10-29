import { useEffect, useState, type FormEvent } from 'react'
import { loadVendorPreferences, saveVendorPreferences } from '../../lib/api'
import type { VendorPreferences } from '../../lib/types'
import { useAuth } from '../../lib/auth'

const defaults: VendorPreferences = {
  booking: {
    acceptInstantBooking: true,
    requiresApproval: false,
    advanceBookingRequired: false,
    numberOfSlots: 1,
    cancellationPolicy: '',
  },
  customerManagement: {
    enableCustomerHistory: true,
    enableAppointmentReminders: true,
    enablePromotionalMessages: false,
    reminderIntervalHours: 2,
    customReminderHours: 2,
  },
}

type BookingToggle = 'acceptInstantBooking' | 'requiresApproval' | 'advanceBookingRequired'
type CustomerToggle = 'enableCustomerHistory' | 'enableAppointmentReminders' | 'enablePromotionalMessages'

const bookingOptions: Array<[BookingToggle, string]> = [
  ['acceptInstantBooking', 'Accept instant booking'],
  ['requiresApproval', 'Booking requires approval'],
  ['advanceBookingRequired', 'Advance booking required'],
]

const customerOptions: Array<[CustomerToggle, string]> = [
  ['enableCustomerHistory', 'Enable customer history'],
  ['enableAppointmentReminders', 'Enable appointment reminders'],
  ['enablePromotionalMessages', 'Enable promotional messages'],
]

export function VendorBookingPrefsPage({ section = 'all' }: { section?: 'all' | 'booking' | 'customer' }) {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<VendorPreferences>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    void loadVendorPreferences()
      .then((result) => {
        if (active) setPreferences(result)
      })
      .catch((err: unknown) => {
        console.error('Could not load business preferences:', err)
        if (active) setError(err instanceof Error ? err.message : 'Could not load business preferences.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user?.authProvider])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)
    try {
      const result = await saveVendorPreferences(preferences)
      setPreferences(result)
      setSaved(true)
    } catch (err) {
      console.error('Could not save business preferences:', err)
      setError(err instanceof Error ? err.message : 'Could not save business preferences.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <h1>{section === 'customer' ? 'Customer management' : 'Booking preferences'}</h1>
      <p style={{ color: 'var(--may5-muted)' }}>Choose how customer appointments and reminders are handled.</p>
      {loading ? <p role="status">Loading preferences…</p> : (
        <form onSubmit={(event) => void save(event)}>
          {section !== 'customer' && <section className="may5-card" style={{ padding: 16, marginTop: 16 }}>
            <h2>Booking preferences</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {bookingOptions.map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={preferences.booking[key]}
                    onChange={(event) => setPreferences({
                      ...preferences,
                      booking: { ...preferences.booking, [key]: event.target.checked },
                    })}
                  />
                  {label}
                </label>
              ))}
            </div>
            <label htmlFor="vendor-slot-count" style={{ display: 'block', marginTop: 16 }}>Number of slots (chairs / stations available at once)</label>
            <input
              id="vendor-slot-count"
              className="may5-input"
              type="number"
              min={1}
              max={500}
              value={preferences.booking.numberOfSlots}
              onChange={(event) => setPreferences({
                ...preferences,
                booking: { ...preferences.booking, numberOfSlots: Number(event.target.value) },
              })}
              required
            />
            <label htmlFor="vendor-cancellation-policy" style={{ display: 'block', marginTop: 16 }}>Cancellation policy</label>
            <textarea
              id="vendor-cancellation-policy"
              className="may5-input"
              rows={3}
              maxLength={1000}
              placeholder="Describe your cancellation and rescheduling policy"
              value={preferences.booking.cancellationPolicy}
              onChange={(event) => setPreferences({
                ...preferences,
                booking: { ...preferences.booking, cancellationPolicy: event.target.value },
              })}
            />
          </section>}

          {section !== 'booking' && <section className="may5-card" style={{ padding: 16, marginTop: 16 }}>
            <h2>Customer management</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {customerOptions.map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={preferences.customerManagement[key]}
                    onChange={(event) => setPreferences({
                      ...preferences,
                      customerManagement: { ...preferences.customerManagement, [key]: event.target.checked },
                    })}
                  />
                  {label}
                </label>
              ))}
            </div>
            <label htmlFor="vendor-reminder-interval" style={{ display: 'block', marginTop: 16 }}>Reminder interval</label>
            <select
              id="vendor-reminder-interval"
              className="may5-input"
              value={preferences.customerManagement.reminderIntervalHours}
              onChange={(event) => {
                const value = event.target.value === 'custom' ? 'custom' : Number(event.target.value) as 2 | 24 | 48
                setPreferences({
                  ...preferences,
                  customerManagement: { ...preferences.customerManagement, reminderIntervalHours: value },
                })
              }}
            >
              <option value={2}>2 hours before</option>
              <option value={24}>24 hours before</option>
              <option value={48}>48 hours before</option>
              <option value="custom">Custom</option>
            </select>
            {preferences.customerManagement.reminderIntervalHours === 'custom' && (
              <>
                <label htmlFor="vendor-reminder-custom" style={{ display: 'block', marginTop: 12 }}>Custom hours before appointment</label>
                <input
                  id="vendor-reminder-custom"
                  className="may5-input"
                  type="number"
                  min={1}
                  max={720}
                  value={preferences.customerManagement.customReminderHours}
                  onChange={(event) => setPreferences({
                    ...preferences,
                    customerManagement: { ...preferences.customerManagement, customReminderHours: Number(event.target.value) },
                  })}
                  required
                />
              </>
            )}
            <p style={{ color: 'var(--may5-muted)', fontSize: '0.9rem' }}>
              Promotional messages must only be sent to customers who have consented and must include an opt-out.
            </p>
          </section>}
          {error && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{error}</p>}
          {saved && <p role="status" style={{ color: 'var(--may5-success)' }}>Business preferences saved.</p>}
          <button className="may5-btn may5-btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </form>
      )}
    </>
  )
}
