import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bell, Building2, CalendarDays, ChevronRight, CircleHelp, FileText, Flag, Info, MapPin, SlidersHorizontal, Sparkles } from 'lucide-react'
import { deleteCustomerAccount, loadCustomerNotifications, loadCustomerSettings, reportCustomerProblem, saveCustomerSettings, sendPushTestNotification } from '../../lib/api'
import { store } from '../../lib/store'
import type { CustomerAddress, CustomerNotification, CustomerSettings } from '../../lib/types'
import { formatIndianDate } from '../../lib/format'
import { disableBrowserPushNotifications, enableBrowserPushNotifications } from '../../lib/pushNotifications'

const initialSettings: CustomerSettings = {
  addresses: [],
  notifications: {
    bookingConfirmations: true,
    appointmentReminders: true,
    bookingStatusUpdates: true,
    offersAndPromotions: true,
  },
  bookingPreferences: { serviceLocation: 'salon', preferredTime: '' },
  groomingPreferences: { hairType: '', skinType: '', allergies: '', notes: '' },
}

const sectionTitles: Record<string, string> = {
  addresses: 'My addresses',
  notifications: 'Notifications',
  preferences: 'Booking preferences',
  grooming: 'Grooming / service preferences',
  help: 'Help center & FAQs',
  report: 'Report a problem',
  legal: 'Privacy, terms & policies',
  about: 'About MAY5',
  'delete-account': 'Delete account',
}

export function CustomerSettingsPage() {
  const { section = '' } = useParams()
  const navigate = useNavigate()
  const [settings, setSettings] = useState<CustomerSettings>(initialSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [address, setAddress] = useState<CustomerAddress>({ id: '', label: '', address: '', city: '', pincode: '' })
  const [reportCategory, setReportCategory] = useState('other')
  const [reportMessage, setReportMessage] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [notifications, setNotifications] = useState<CustomerNotification[]>([])
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushError, setPushError] = useState('')
  const [pushMessage, setPushMessage] = useState('')

  useEffect(() => {
    let active = true
    void loadCustomerSettings().then((saved) => {
      if (active) {
        setSettings({
          ...saved,
          bookingPreferences: { ...saved.bookingPreferences, serviceLocation: 'salon' },
        })
      }
    }).catch((err: unknown) => {
      console.error('Could not load customer settings:', err)
      if (active) setError(err instanceof Error ? err.message : 'Could not load your settings.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (section !== 'notifications') return
    let active = true
    void loadCustomerNotifications().then((items) => {
      if (active) setNotifications(items)
    }).catch((err: unknown) => {
      console.error('Could not load notification inbox:', err)
      if (active) setError(err instanceof Error ? err.message : 'Could not load notifications.')
    })
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistration('/service-worker.js')
        .then((registration) => registration?.pushManager.getSubscription())
        .then((subscription) => {
          if (active) setPushEnabled(Boolean(subscription))
        })
        .catch((err: unknown) => {
          console.error('Could not check browser push subscription:', err)
        })
    }
    return () => { active = false }
  }, [section])

  async function persist(next: CustomerSettings) {
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const saved = await saveCustomerSettings({
        ...next,
        bookingPreferences: { ...next.bookingPreferences, serviceLocation: 'salon' },
      })
      setSettings({
        ...saved,
        bookingPreferences: { ...saved.bookingPreferences, serviceLocation: 'salon' },
      })
      setSuccess('Your changes have been saved.')
    } catch (err) {
      console.error('Could not save customer settings:', err)
      setError(err instanceof Error ? err.message : 'Could not save your changes.')
    } finally {
      setSaving(false)
    }
  }

  function updateSettings(patch: Partial<CustomerSettings>) {
    const next = { ...settings, ...patch }
    setSettings(next)
    void persist(next)
  }

  async function submitAddress(event: FormEvent) {
    event.preventDefault()
    const nextAddress = { ...address, id: address.id || crypto.randomUUID() }
    const addresses = address.id
      ? settings.addresses.map((item) => item.id === address.id ? nextAddress : item)
      : [...settings.addresses, nextAddress]
    setAddress({ id: '', label: '', address: '', city: '', pincode: '' })
    await persist({ ...settings, addresses })
  }

  async function submitReport(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await reportCustomerProblem({ category: reportCategory, message: reportMessage })
      setReportMessage('')
      setSuccess('Your report was sent to MAY5 support.')
    } catch (err) {
      console.error('Could not submit support report:', err)
      setError(err instanceof Error ? err.message : 'Could not submit your report.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteAccount() {
    if (confirmation !== 'DELETE') return
    setSaving(true)
    setError('')
    try {
      await deleteCustomerAccount()
      store.logout()
      navigate('/auth/phone', { replace: true })
    } catch (err) {
      console.error('Could not delete customer account:', err)
      setError(err instanceof Error ? err.message : 'Could not delete your account.')
      setSaving(false)
    }
  }

  async function togglePushNotifications() {
    setPushError('')
    setPushMessage('')
    setPushBusy(true)
    try {
      if (pushEnabled) {
        await disableBrowserPushNotifications()
        setPushEnabled(false)
        setPushMessage('Browser notifications are off.')
      } else {
        await enableBrowserPushNotifications()
        setPushEnabled(true)
        setPushMessage('Browser notifications are enabled on this device.')
      }
    } catch (err) {
      console.error('Could not update browser push notifications:', err)
      setPushError(err instanceof Error ? err.message : 'Could not update notifications.')
    } finally {
      setPushBusy(false)
    }
  }

  const title = sectionTitles[section] ?? 'Customer settings'
  return (
    <>
      <header className="may5-header-mobile">
        <div className="may5-header-row">
          <Link to="/customer/profile" aria-label="Back to profile"><ArrowLeft /></Link>
          <h1>{title}</h1>
          <span />
        </div>
      </header>
      <main className="may5-page-pad">
        {loading && <p role="status">Loading your settings…</p>}
        {!loading && section === 'addresses' && (
          <>
            <p className="settings-muted">Save addresses for faster bookings.</p>
            {settings.addresses.map((item) => (
              <div className="may5-card settings-row" key={item.id}>
                <div><strong>{item.label}</strong><p>{item.address}, {item.city} {item.pincode}</p></div>
                <div className="settings-actions">
                  <button type="button" onClick={() => setAddress(item)}>Edit</button>
                  <button type="button" onClick={() => void persist({ ...settings, addresses: settings.addresses.filter((entry) => entry.id !== item.id) })}>Remove</button>
                </div>
              </div>
            ))}
            <form className="may5-card settings-form" onSubmit={(event) => void submitAddress(event)}>
              <h2>{address.id ? 'Edit address' : 'Add an address'}</h2>
              <label>Label<input className="may5-input" required maxLength={40} placeholder="Home, Work…" value={address.label} onChange={(e) => setAddress({ ...address, label: e.target.value })} /></label>
              <label>Address<input className="may5-input" required maxLength={300} value={address.address} onChange={(e) => setAddress({ ...address, address: e.target.value })} /></label>
              <label>City<input className="may5-input" required maxLength={100} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} /></label>
              <label>PIN code<input className="may5-input" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} /></label>
              <button className="may5-btn may5-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save address'}</button>
            </form>
          </>
        )}
        {!loading && section === 'notifications' && (
          <section>
            <h2>Notifications inbox</h2>
            <p className="settings-muted">Receive confirmations and reminders even when MAY5 is not open.</p>
            <button type="button" className={`may5-btn ${pushEnabled ? 'may5-btn-secondary' : 'may5-btn-primary'}`} disabled={pushBusy} onClick={() => void togglePushNotifications()}>
              {pushBusy ? 'Updating…' : pushEnabled ? 'Turn off browser notifications' : 'Enable browser notifications'}
            </button>
            {pushMessage && <p role="status" className="settings-success">{pushMessage}</p>}
            {pushError && <p role="alert" className="settings-error">{pushError}</p>}
            {pushEnabled && <button type="button" className="may5-btn may5-btn-ghost" disabled={pushBusy} onClick={() => {
              setPushError('')
              setPushMessage('')
              setPushBusy(true)
              void sendPushTestNotification().then(() => setPushMessage('Test notification sent to this device.')).catch((err: unknown) => {
                console.error('Could not send test push notification:', err)
                setPushError(err instanceof Error ? err.message : 'Could not send test notification.')
              }).finally(() => setPushBusy(false))
            }}>Send a test notification</button>}
            {notifications.length === 0 && <p className="settings-muted">You’re up to date. Booking updates will appear here.</p>}
            {notifications.map((notification) => (
              <Link className="may5-card settings-row settings-notification" to={notification.type.includes('booking') || notification.type === 'appointment_reminder' ? '/customer/bookings' : '/customer/explore'} key={notification.id}>
                <Bell size={20} />
                <div><strong>{notification.title}</strong><p>{notification.body}</p><small>{formatIndianDate(notification.createdAt)}</small></div>
              </Link>
            ))}
            <h2 className="settings-section-title">Notification preferences</h2>
            <ToggleRow label="Booking confirmations" checked={settings.notifications.bookingConfirmations} disabled={saving} onChange={(value) => updateSettings({ notifications: { ...settings.notifications, bookingConfirmations: value } })} />
            <ToggleRow label="Appointment reminders" checked={settings.notifications.appointmentReminders} disabled={saving} onChange={(value) => updateSettings({ notifications: { ...settings.notifications, appointmentReminders: value } })} />
            <ToggleRow label="Booking status updates" checked={settings.notifications.bookingStatusUpdates} disabled={saving} onChange={(value) => updateSettings({ notifications: { ...settings.notifications, bookingStatusUpdates: value } })} />
            <ToggleRow label="Offers & promotions" checked={settings.notifications.offersAndPromotions} disabled={saving} onChange={(value) => updateSettings({ notifications: { ...settings.notifications, offersAndPromotions: value } })} />
          </section>
        )}
        {!loading && section === 'preferences' && (
          <section className="may5-card settings-form">
            <h2>Booking preferences</h2>
            <p className="settings-muted">Appointments are booked at the service provider’s location.</p>
            <label>Preferred appointment time
              <select className="may5-input" value={settings.bookingPreferences.preferredTime} onChange={(e) => updateSettings({ bookingPreferences: { ...settings.bookingPreferences, preferredTime: e.target.value } })}>
                <option value="">No preference</option><option>Morning</option><option>Afternoon</option><option>Evening</option>
              </select>
            </label>
          </section>
        )}
        {!loading && section === 'grooming' && (
          <section className="may5-card settings-form">
            <Sparkles size={28} />
            <p className="settings-muted">Share details to help service providers prepare for your appointment.</p>
            {([
              ['hairType', 'Hair type'],
              ['skinType', 'Skin type'],
              ['allergies', 'Allergies or sensitivities'],
              ['notes', 'Other service preferences'],
            ] as const).map(([key, label]) => (
              <label key={key}>{label}
                <textarea className="may5-input settings-textarea" maxLength={500} value={settings.groomingPreferences[key]} onChange={(e) => setSettings({ ...settings, groomingPreferences: { ...settings.groomingPreferences, [key]: e.target.value } })} />
              </label>
            ))}
            <button className="may5-btn may5-btn-primary" disabled={saving} onClick={() => void persist(settings)}>{saving ? 'Saving…' : 'Save preferences'}</button>
          </section>
        )}
        {!loading && section === 'help' && (
          <section>
            <p className="settings-muted">Answers to common questions about using MAY5.</p>
            <Faq question="How do I book an appointment?" answer="Explore salons or services, choose an option, then select a date and time on the booking page." />
            <Faq question="Can I cancel a booking?" answer="Open My bookings and contact the salon directly for changes or cancellation. Cancellation options depend on the salon’s policy." />
            <Faq question="How do I contact support?" answer="Use Report a problem in your profile and include the booking or issue details. The MAY5 team will receive your report." />
            <Link className="may5-btn may5-btn-secondary settings-help-link" to="/customer/profile/report">Report a problem</Link>
          </section>
        )}
        {!loading && section === 'report' && (
          <form className="may5-card settings-form" onSubmit={(event) => void submitReport(event)}>
            <p className="settings-muted">Tell us what happened. Please do not include passwords or payment card details.</p>
            <label>Issue type<select className="may5-input" value={reportCategory} onChange={(e) => setReportCategory(e.target.value)}><option value="booking">Booking</option><option value="business">Salon or service</option><option value="account">Account</option><option value="payment">Payment</option><option value="other">Other</option></select></label>
            <label>Details<textarea className="may5-input settings-textarea" required minLength={10} maxLength={3000} value={reportMessage} onChange={(e) => setReportMessage(e.target.value)} placeholder="Describe the problem (at least 10 characters)" /></label>
            <button className="may5-btn may5-btn-primary" disabled={saving}>{saving ? 'Sending…' : 'Send report'}</button>
          </form>
        )}
        {!loading && section === 'legal' && (
          <section className="may5-card settings-form">
            <h2>Privacy</h2><p>MAY5 uses the information you provide to manage your account, bookings, saved salons, and customer preferences. Your saved addresses and grooming details are used to support bookings. You can remove these details or delete your customer account from Profile.</p>
            <h2>Terms of use</h2><p>Salon services are provided by the listed businesses. Confirm service details, availability, and cancellation terms with the provider before booking.</p>
            <h2>Safety</h2><p>Do not share passwords, one-time codes, or payment credentials with anyone. Contact support if you notice suspicious account activity.</p>
          </section>
        )}
        {!loading && section === 'about' && (
          <section className="may5-card settings-form"><img src="/may5-brand.png" alt="MAY5" className="may5-logo" /><h2>Sign your style</h2><p>Discover salons, beauty parlours, barbers, spas, and services with MAY5. Explore local providers and manage your appointments in one place.</p><p className="settings-muted">MAY5 · Customer experience</p></section>
        )}
        {!loading && section === 'delete-account' && (
          <section className="may5-card settings-form">
            <h2>Delete your customer account?</h2>
            <p>This permanently deletes your MAY5 customer account, saved preferences, addresses, favorites, and booking records. This action cannot be undone.</p>
            <p>To confirm, type <strong>DELETE</strong> below.</p>
            <input className="may5-input" aria-label="Type DELETE to confirm" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
            <button className="may5-btn may5-btn-primary settings-danger" disabled={confirmation !== 'DELETE' || saving} onClick={() => void deleteAccount()}>{saving ? 'Deleting…' : 'Permanently delete account'}</button>
          </section>
        )}
        {error && <p role="alert" className="settings-error">{error}</p>}
        {success && <p role="status" className="settings-success">{success}</p>}
        {saving && <span className="settings-sr-only" role="status">Saving settings</span>}
      </main>
    </>
  )
}

function ToggleRow({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
  return <label className="may5-card settings-toggle">{label}<input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /><span aria-hidden="true" /></label>
}

function Faq({ question, answer }: { question: string; answer: string }) {
  return <details className="may5-card settings-faq"><summary>{question}</summary><p>{answer}</p></details>
}

export function CustomerProfileSectionLinks() {
  const sections = [
    { title: 'Location & booking', items: [{ label: 'My addresses', to: '/customer/profile/addresses', icon: MapPin }, { label: 'Booking preferences', to: '/customer/profile/preferences', icon: SlidersHorizontal }] },
    { title: 'My bookings', items: [{ label: 'My bookings', to: '/customer/bookings', icon: CalendarDays }, { label: 'Booking history', to: '/customer/profile/history', icon: CalendarDays }] },
    { title: 'Notifications', items: [{ label: 'Notifications inbox', to: '/customer/profile/notifications', icon: Bell }] },
    { title: 'Services', items: [{ label: 'Grooming / service preferences', to: '/customer/profile/grooming', icon: Sparkles }] },
    { title: 'Help & support', items: [{ label: 'Help center & FAQs', to: '/customer/profile/help', icon: CircleHelp }, { label: 'Report a problem', to: '/customer/profile/report', icon: Flag }] },
    { title: 'Legal & about', items: [{ label: 'Privacy, terms & policies', to: '/customer/profile/legal', icon: FileText }, { label: 'About MAY5', to: '/customer/profile/about', icon: Info }] },
  ]
  return <div className="settings-profile-sections">{sections.map((group) => <section key={group.title}><h2>{group.title}</h2><div className="settings-link-group">{group.items.map(({ label, to, icon: Icon }) => <Link to={to} className="settings-profile-link" key={to}><span className="settings-icon"><Icon size={20} /></span><span>{label}</span><ChevronRight size={19} className="settings-chevron" /></Link>)}</div></section>)}
    <Link to="/role-select" className="settings-profile-link settings-switch-business"><Building2 size={21} /><strong>Switch to business account</strong><ChevronRight size={19} className="settings-chevron" /></Link>
  </div>
}

export function CustomerDeleteAccountLink() {
  return <Link className="settings-delete-link" to="/customer/profile/delete-account">Delete account</Link>
}

export function CustomerLogoutLink({ children }: { children: ReactNode }) {
  return <Link className="settings-logout-link" to="/customer/profile/logout">{children}</Link>
}
