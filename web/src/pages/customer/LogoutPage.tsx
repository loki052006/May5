import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

export function LogoutPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void logout()
      .then(() => {
        if (active) navigate('/auth/phone')
      })
      .catch((err: unknown) => {
        console.error('Could not end MAY5 session:', err)
        if (active) setError('Could not sign out. Please try again.')
      })
    return () => {
      active = false
    }
  }, [logout, navigate])

  return error ? <p className="may5-page-pad" role="alert">{error}</p> : null
}
