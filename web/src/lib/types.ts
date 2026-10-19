export type UserRole = 'customer' | 'vendor' | 'admin'

export type PaymentMode = 'online' | 'offline'

export interface UserProfile {
  id: string
  fullName: string
  phone: string
  email?: string
  authProvider?: 'google' | 'demo'
  role: UserRole
  age?: number
  gender?: string
  avatarUrl?: string | null
  locationLabel?: string
}

export interface Salon {
  id: string
  name: string
  address: string
  rating: number
  coverImage: string
  promo?: string
  homeService: boolean
  onlineServices: boolean
  lat: number
  lng: number
  branchId?: string
}

export interface ServiceItem {
  id: string
  salonId: string
  name: string
  price: number
  durationMin: number
  category: 'popular' | 'other'
  homeService: boolean
  imageUrl?: string
}

export interface StaffMember {
  id: string
  salonId: string
  fullName: string
  avatarUrl: string
  rating: number
}

export interface VendorStaff {
  id: string
  salonId: string
  fullName: string
  position: string
  phone: string
  email: string
  active: boolean
}

export interface Booking {
  id: string
  customerId: string
  salonId: string
  serviceId: string
  staffId?: string
  status: 'scheduled' | 'completed' | 'cancelled'
  scheduledAt: string
  paymentMode: PaymentMode
  mediaAuthorized: boolean
  mediaUrls?: string[]
}

export interface Branch {
  id: string
  vendorId: string
  name: string
  address: string
  seatCapacity: number
  serviceCapacityPerHour: number
}

export interface SalonFilters {
  sort: 'distance' | 'top_reviewed' | 'most_popular'
  maxDistanceKm: number
  specialOffers: boolean
  homeService: boolean
  onlineServices: boolean
}
