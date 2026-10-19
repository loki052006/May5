import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

export function AdminGatePage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const { passAdminGate } = useAuth()
  const navigate = useNavigate()

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!passAdminGate(pin)) {
      setError('Invalid access code. Approval is handled by the MAY5 platform team.')
      return
    }
    navigate('/admin/dashboard')
  }

  return (
    <div className="may5-page-pad" style={{ maxWidth: 420, paddingTop: 48 }}>
      <img src="/may5-logo.svg" alt="MAY5" className="may5-logo" />
      <h1>Admin gate</h1>
      <p style={{ color: 'var(--may5-muted)' }}>Enter platform access code (demo: MAY5).</p>
      <form onSubmit={onSubmit}>
        <input className="may5-input" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Access code" />
        {error && <p style={{ color: 'var(--may5-danger)' }}>{error}</p>}
        <button type="submit" className="may5-btn may5-btn-primary" style={{ width: '100%', marginTop: 16 }}>
          Continue
        </button>
      </form>
    </div>
  )
}
