import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleIcon } from '../../components/GoogleIcon'
import { useAuth } from '../../lib/auth'

export function PhonePage() {
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const { sendOtp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      setError('Enter your name to continue.')
      return
    }
    const digits = phone.replace(/\D/g, '')
    const nationalNumber = digits.length === 12 && digits.startsWith('91')
      ? digits.slice(2)
      : digits
    if (!/^[6-9]\d{9}$/.test(nationalNumber)) {
      setError('Enter a valid 10-digit Indian mobile number.')
      return
    }
    sendOtp(`+91${nationalNumber}`, trimmedUsername)
    navigate('/auth/otp')
  }

  async function onGoogle() {
    setError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      navigate('/role-select')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="may5-page-pad" style={{ maxWidth: 420, paddingTop: 48 }}>
      <img src="/may5-brand.png" alt="MAY5 — Sign your style" className="may5-logo" style={{ marginBottom: 24 }} />
      <h1 style={{ margin: '0 0 8px', fontSize: '1.75rem' }}>Sign in</h1>
      <p style={{ color: 'var(--may5-muted)', marginBottom: 24 }}>
        Enter your phone number to sign in, or continue with Google.
      </p>

      <button
        type="button"
        className="may5-btn may5-btn-google"
        onClick={onGoogle}
        disabled={googleLoading}
      >
        <GoogleIcon />
        {googleLoading ? 'Signing in…' : 'Continue with Google'}
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '20px 0',
          color: 'var(--may5-muted)',
          fontSize: '0.875rem',
        }}
      >
        <span style={{ flex: 1, height: 1, background: 'rgba(130,121,106,0.35)' }} />
        or phone OTP
        <span style={{ flex: 1, height: 1, background: 'rgba(130,121,106,0.35)' }} />
      </div>

      <form onSubmit={onSubmit}>
        <label htmlFor="username" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
          Your name
        </label>
        <input
          id="username"
          className="may5-input"
          placeholder="Enter your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="name"
          maxLength={80}
          required
        />
        <label htmlFor="phone" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
          Mobile number
        </label>
        <input
          id="phone"
          className="may5-input"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
        />
        {error && (
          <div role="alert" className="signin-error">
            <p>{error}</p>
            {error.includes('Authorized JavaScript origins') && (
              <p className="signin-error-help">
                In Google Cloud Console, open APIs &amp; Services → Credentials, select the MAY5 OAuth 2.0 Web client, add the origin shown above under <strong>Authorized JavaScript origins</strong> (not redirect URIs), then save. Changes can take a few minutes to apply.
              </p>
            )}
          </div>
        )}
        <button type="submit" className="may5-btn may5-btn-primary" style={{ width: '100%', marginTop: 16 }}>
          Send OTP
        </button>
      </form>

      <p style={{ marginTop: 24, fontSize: '0.8rem', color: 'var(--may5-muted)' }}>
        Demo OTP for any valid Indian mobile number: <strong>123456</strong>
      </p>
      <Link to="/customer/home" style={{ fontSize: '0.85rem', color: 'var(--may5-terracotta)' }}>
        Back to explore (guest)
      </Link>
    </div>
  )
}
