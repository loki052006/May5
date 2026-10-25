import { useState, type FormEvent } from 'react'
import { reportCustomerProblem } from '../../lib/api'

export function VendorHelpPage() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await reportCustomerProblem({ category: 'business', message: `${subject.trim()}\n\n${message.trim()}` })
      setSubject('')
      setMessage('')
      setSuccess('Your message was sent to MAY5 support.')
    } catch (err) {
      console.error('Could not submit vendor support request:', err)
      setError(err instanceof Error ? err.message : 'Could not contact support.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <h1>Help &amp; support</h1>
      <section className="may5-card" style={{ padding: 16, marginTop: 16 }}>
        <h2>Frequently asked questions</h2>
        <h3>How do I manage appointments?</h3>
        <p>Open Calendar to see today's, upcoming, and past appointments. Update appointment status from its card.</p>
        <h3>How do I add a service or package?</h3>
        <p>Add services from Services, then bundle one or more services from Packages.</p>
        <h3>How do customers find my business?</h3>
        <p>Complete your business profile, add services, and make sure your listing is approved.</p>
        <h3>How do I contact support?</h3>
        <p>Send the form below. Include the store name and a short description of the issue.</p>
      </section>
      <section className="may5-card" style={{ padding: 16, marginTop: 16 }}>
        <h2>Contact support</h2>
        <form onSubmit={(event) => void submit(event)} style={{ display: 'grid', gap: 10 }}>
          <label htmlFor="vendor-support-subject">Subject</label>
          <input id="vendor-support-subject" className="may5-input" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} placeholder="What's this about?" required />
          <label htmlFor="vendor-support-message">Message</label>
          <textarea id="vendor-support-message" className="may5-input" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2900} minLength={10} rows={5} placeholder="Tell us what's going on" required />
          {error && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{error}</p>}
          {success && <p role="status" style={{ color: 'var(--may5-success)' }}>{success}</p>}
          <button className="may5-btn may5-btn-primary" type="submit" disabled={saving}>{saving ? 'Sending…' : 'Send'}</button>
        </form>
      </section>
    </>
  )
}
