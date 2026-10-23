import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

export function OtpPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const { verifyOtp } = useAuth()
  const navigate = useNavigate()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setVerifying(true)
    try {
      if (!await verifyOtp(code)) {
        setError('Incorrect code.')
        return
      }
      navigate('/role-select')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify demo OTP.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="may5-page-pad" style={{ maxWidth: 420, paddingTop: 48 }}>
      <h1 style={{ margin: '0 0 8px' }}>Verify OTP</h1>
      <p style={{ color: 'var(--may5-muted)' }}>Enter the 6-digit demo OTP sent to your Indian mobile number.</p>
      <p style={{ color: 'var(--may5-muted)' }}>Demo OTP: <strong>123456</strong></p>
      <form onSubmit={onSubmit} style={{ marginTop: 24 }}>
        <input
          className="may5-input"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
          inputMode="numeric"
        />
        {error && <p style={{ color: 'var(--may5-danger)' }}>{error}</p>}
        <button type="submit" className="may5-btn may5-btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={verifying}>
          {verifying ? 'Verifying…' : 'Verify'}
        </button>
      </form>
      <Link to="/auth/phone" style={{ display: 'inline-block', marginTop: 16 }}>
        Back to login
      </Link>
    </div>
  )
}
