import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { signInWithGooglePopup } from './googleSignIn'
import {
  ApiError,
  endGoogleSession,
  loadGoogleBookings,
  loadGoogleFavorites,
  loadGoogleSession,
  signInWithDemoOtp,
  setGoogleFavorite,
  updateGoogleRole,
} from './api'
import { store, getState } from './store'
import type { UserProfile, UserRole } from './types'

const DEMO_OTP = '123456'

interface AuthContextValue {
  user: UserProfile | null
  loading: boolean
  adminGatePassed: boolean
  sendOtp: (phone: string, username: string) => void
  verifyOtp: (code: string) => Promise<boolean>
  signInWithGoogle: () => Promise<UserProfile>
  toggleFavorite: (salonId: string) => Promise<void>
  selectRole: (role: UserRole) => Promise<void>
  passAdminGate: (pin: string) => boolean
  logout: () => Promise<void>
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, tick] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => store.subscribe(() => tick((n) => n + 1)), [])

  useEffect(() => {
    let active = true

    async function restoreSession() {
      try {
        const user = await loadGoogleSession()
        if (!active) return
        store.setUser(user)
        const bookings = await loadGoogleBookings()
        if (active) store.setBookings(bookings)
        const favorites = await loadGoogleFavorites()
        if (active) store.setFavorites(favorites)
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const cachedUser = getState().user
          if (cachedUser?.authProvider === 'google' || cachedUser?.authProvider === 'demo' || cachedUser?.email) {
            store.setUser(null)
            store.setBookings([])
            store.setFavorites([])
          }
        } else {
          console.error('Could not restore MAY5 account session:', err)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void restoreSession()
    return () => {
      active = false
    }
  }, [])

  const currentState = getState()
  const value = useMemo<AuthContextValue>(() => {
    const s = currentState
    return {
      user: s.user,
      loading,
      adminGatePassed: s.adminGatePassed,
      sendOtp(phone: string, username: string) {
        store.setPendingCredentials(phone, username)
      },
      async verifyOtp(code: string) {
        if (code.trim() !== DEMO_OTP) return false
        const { pendingPhone, pendingUsername } = getState()
        const user = await signInWithDemoOtp(pendingPhone, code.trim(), pendingUsername)
        store.setUser({
          ...user,
          locationLabel: 'Bengaluru, 28°C',
        })
        const [bookings, favorites] = await Promise.all([
          loadGoogleBookings(),
          loadGoogleFavorites(),
        ])
        store.setBookings(bookings)
        store.setFavorites(favorites)
        return true
      },
      async signInWithGoogle() {
        const googleUser = await signInWithGooglePopup()
        const profile: UserProfile = {
          id: googleUser.id,
          fullName: googleUser.fullName,
          phone: googleUser.phone,
          email: googleUser.email,
          authProvider: 'google',
          role: googleUser.role,
          age: googleUser.age,
          gender: googleUser.gender,
          locationLabel: 'Bengaluru, 28°C',
          avatarUrl:
            googleUser.avatarUrl ||
            'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
        }
        store.setUser(profile)
        try {
          store.setBookings(await loadGoogleBookings())
        } catch (err) {
          console.error('Could not load account bookings:', err)
        }
        try {
          store.setFavorites(await loadGoogleFavorites())
        } catch (err) {
          console.error('Could not load account favorites:', err)
        }
        return profile
      },
      async toggleFavorite(salonId: string) {
        const isFavorite = getState().favorites.includes(salonId)
        const user = getState().user
        if (user?.authProvider === 'google' || user?.authProvider === 'demo') {
          await setGoogleFavorite(salonId, !isFavorite)
        }
        store.toggleFavorite(salonId)
      },
      async selectRole(role: UserRole) {
        const u = getState().user
        if (!u) return
        if (u.authProvider === 'google' || u.authProvider === 'demo') {
          const updated = await updateGoogleRole(role)
          store.setUser({ ...u, role: updated.role })
        } else {
          store.setUser({ ...u, role })
        }
      },
      passAdminGate(pin: string) {
        const ok = pin.toUpperCase() === 'MAY5'
        if (ok) store.setAdminGatePassed(true)
        return ok
      },
      async logout() {
        const user = getState().user
        store.logout()
        store.setFavorites([])
        if (user?.authProvider === 'google' || user?.authProvider === 'demo') await endGoogleSession()
      },
      refresh() {
        tick((n) => n + 1)
      },
    }
  }, [loading, currentState])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth requires AuthProvider')
  return ctx
}
