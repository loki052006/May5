import { initialBookings } from './mockData'
import type { Booking, SalonFilters, UserProfile } from './types'

const KEY = 'may5-web-state'

export interface AppState {
  user: UserProfile | null
  pendingPhone: string
  favorites: string[]
  bookings: Booking[]
  filters: SalonFilters
  adminGatePassed: boolean
  followedVideos: string[]
  bookingLocationPref: 'salon' | 'home'
}

const defaultFilters: SalonFilters = {
  sort: 'distance',
  maxDistanceKm: 10,
  specialOffers: false,
  homeService: false,
  onlineServices: false,
}

const defaultState: AppState = {
  user: null,
  pendingPhone: '',
  favorites: [],
  bookings: initialBookings,
  filters: defaultFilters,
  adminGatePassed: false,
  followedVideos: [],
  bookingLocationPref: 'salon',
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...defaultState, bookings: [...initialBookings] }
    return { ...defaultState, ...JSON.parse(raw) }
  } catch {
    return { ...defaultState, bookings: [...initialBookings] }
  }
}

let state = typeof window !== 'undefined' ? load() : defaultState
const listeners = new Set<() => void>()

function persist() {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function getState() {
  return state
}

export function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function setState(partial: Partial<AppState>) {
  state = { ...state, ...partial }
  persist()
  listeners.forEach((l) => l())
}

export const store = {
  setPendingPhone(phone: string) {
    setState({ pendingPhone: phone })
  },
  setUser(user: UserProfile | null) {
    setState({ user })
  },
  toggleFavorite(salonId: string) {
    const set = new Set(state.favorites)
    if (set.has(salonId)) set.delete(salonId)
    else set.add(salonId)
    setState({ favorites: [...set] })
  },
  setFilters(filters: Partial<SalonFilters>) {
    setState({ filters: { ...state.filters, ...filters } })
  },
  resetFilters() {
    setState({ filters: { ...defaultFilters } })
  },
  addBooking(booking: Booking) {
    setState({ bookings: [booking, ...state.bookings] })
  },
  setBookings(bookings: Booking[]) {
    setState({ bookings })
  },
  setFavorites(favorites: string[]) {
    setState({ favorites })
  },
  setAdminGatePassed(value: boolean) {
    setState({ adminGatePassed: value })
  },
  toggleVideoFollow(id: string) {
    const set = new Set(state.followedVideos)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    setState({ followedVideos: [...set] })
  },
  setBookingLocationPref(pref: 'salon' | 'home') {
    setState({ bookingLocationPref: pref })
  },
  updateProfile(patch: Partial<UserProfile>) {
    if (!state.user) return
    setState({ user: { ...state.user, ...patch } })
  },
  logout() {
    setState({
      user: null,
      adminGatePassed: false,
      pendingPhone: '',
      bookings: [...initialBookings],
      favorites: [],
    })
  },
  subscribe,
}
