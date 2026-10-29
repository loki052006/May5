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

export interface CustomerAddress {
  id: string
  label: string
  address: string
  city: string
  pincode: string
}

export interface CustomerSettings {
  addresses: CustomerAddress[]
  notifications: {
    bookingConfirmations: boolean
    appointmentReminders: boolean
    bookingStatusUpdates: boolean
    offersAndPromotions: boolean
  }
  bookingPreferences: {
    serviceLocation: 'salon' | 'home'
    preferredTime: string
  }
  groomingPreferences: {
    hairType: string
    skinType: string
    allergies: string
    notes: string
  }
}

export interface CustomerNotification {
  id: string
  type: 'booking_confirmation' | 'appointment_reminder' | 'booking_update' | 'offer'
  title: string
  body: string
  createdAt: string
  read: boolean
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
  businessType?: string
  description?: string
  phone?: string
  email?: string
  website?: string
  openingHours?: string
  amenities?: string[]
  advancePaymentRequired?: boolean
  packages?: Array<{
    id: string
    title: string
    description: string
    serviceIds: string[]
    price: number | null
  }>
  portfolio?: Array<{
    id: string
    title: string
    description: string
    imageUrl: string
  }>
  targetAudience?: 'women' | 'men' | 'unisex'
  demoListing?: boolean
}

export interface VendorBusinessProfile {
  id: string
  businessName: string
  businessType: string
  description: string
  address: string
  locality: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
  website: string
  openingHours: string
  openingDays: number[]
  openingTime: string
  closingTime: string
  amenities: string[]
  shopPhoto: string
  targetAudience: 'women' | 'men' | 'unisex'
  lat: number | null
  lng: number | null
}

export interface VendorPreferences {
  booking: {
    acceptInstantBooking: boolean
    requiresApproval: boolean
    advanceBookingRequired: boolean
    advancePaymentRequired: boolean
    numberOfSlots: number
    cancellationPolicy: string
  }
  customerManagement: {
    enableCustomerHistory: boolean
    enableAppointmentReminders: boolean
    enablePromotionalMessages: boolean
    reminderIntervalHours: 2 | 24 | 48 | 'custom'
    customReminderHours: number
  }
}

export interface VendorContent {
  id: string
  kind: 'package' | 'portfolio' | 'promotion'
  title: string
  description: string
  imageUrl: string
  serviceIds: string[]
  price: number | null
  discountPercent: number | null
  startsAt: string
  endsAt: string
  active: boolean
  createdAt: string
}

export interface VendorCustomer {
  id: string
  fullName: string
  phone: string
  email: string
  bookingCount: number
  lastVisit: string
}

export interface VendorBooking extends Booking {
  customerName: string
  customerPhone: string
  serviceName: string
  servicePrice: number
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
  imageUrls?: string[]
  description?: string
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
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled'
  scheduledAt: string
  paymentMode: PaymentMode
  mediaAuthorized: boolean
  mediaUrls?: string[]
  demoListing?: boolean
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
  onlineServices: boolean
  openNow: boolean
  rating45: boolean
  ladiesOnly: boolean
  serviceCategory: string
}
