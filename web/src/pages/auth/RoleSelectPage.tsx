import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import type { UserRole } from '../../lib/types'

const options: { role: UserRole; title: string; desc: string; path: string }[] = [
  {
    role: 'customer',
    title: 'Customer',
    desc: 'Book salons, explore, favorites, and manage your profile.',
    path: '/customer/home',
  },
  {
    role: 'vendor',
    title: 'Business',
    desc: 'Set up your store details, publish your services, and manage your business.',
    path: '/vendor/settings',
  },
  {
    role: 'admin',
    title: 'Admin',
    desc: 'Platform approvals, vendors, and support.',
    path: '/admin/gate',
  },
]

export function RoleSelectPage() {
  const { user, selectRole } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    navigate('/auth/phone')
    return null
  }

  function choose(role: UserRole, path: string) {
    void selectRole(role)
      .then(() => navigate(path))
      .catch((err: unknown) => {
        console.error('Could not save selected account role:', err)
      })
  }

  return (
    <div className="may5-page-pad" style={{ maxWidth: 480, paddingTop: 40 }}>
      <h1>Choose how you use MAY5</h1>
      <p style={{ color: 'var(--may5-muted)' }}>Signed in as {user.fullName}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
        {options.filter((o) => o.role !== 'admin' || user.role === 'admin').map((o) => (
          <button
            key={o.role}
            type="button"
            className="may5-card"
            style={{ padding: 16, textAlign: 'left', border: 'none', cursor: 'pointer' }}
            onClick={() => choose(o.role, o.path)}
          >
            <strong>{o.title}</strong>
            <p style={{ margin: '8px 0 0', color: 'var(--may5-muted)', fontSize: '0.9rem' }}>
              {o.desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
