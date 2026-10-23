import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import type { UserRole } from '../lib/types'

export function RequireAuth({
  children,
  role,
}: {
  children: React.ReactNode
  role?: UserRole
}) {
  const { user, loading } = useAuth()
  const loc = useLocation()

  if (loading) return null

  if (!user) {
    return <Navigate to="/auth/phone" replace state={{ from: loc.pathname }} />
  }

  if (!role) return <>{children}</>

  if (user.role !== role) {
    return <Navigate to="/role-select" replace />
  }

  return <>{children}</>
}

export function RequireAdminGate({ children }: { children: React.ReactNode }) {
  const { user, adminGatePassed } = useAuth()
  if (user?.role === 'admin' && !adminGatePassed) {
    return <Navigate to="/admin/gate" replace />
  }
  return <>{children}</>
}
