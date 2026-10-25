import type { Booking, Branch, CustomerNotification, CustomerSettings, Salon, ServiceItem, UserProfile, UserRole, VendorBooking, VendorBusinessProfile, VendorContent, VendorCustomer, VendorPreferences, VendorStaff } from './types'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new ApiError(body.error ?? `Request failed (${response.status})`, response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function loadGoogleSession(): Promise<UserProfile> {
  return request<UserProfile>('/api/auth/session')
}

export function signInWithDemoOtp(phone: string, code: string, fullName: string): Promise<UserProfile> {
  return request<UserProfile>('/api/auth/demo-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, code, fullName }),
  })
}

export async function endGoogleSession(): Promise<void> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new ApiError(body.error ?? 'Could not end user session', response.status)
  }
}

export function updateGoogleProfile(
  profile: Partial<Pick<UserProfile, 'fullName' | 'phone' | 'age' | 'gender' | 'avatarUrl'>> & {
    age?: number | null
    avatarUrl?: string | null
  },
): Promise<UserProfile> {
  return request<UserProfile>('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  })
}

export function updateGoogleRole(role: UserRole): Promise<UserProfile> {
  return request<UserProfile>('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
}

export function loadCustomerSettings(): Promise<CustomerSettings> {
  return request<CustomerSettings>('/api/customer/settings')
}

export function saveCustomerSettings(settings: CustomerSettings): Promise<CustomerSettings> {
  return request<CustomerSettings>('/api/customer/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  })
}

export function reportCustomerProblem(details: { category: string; message: string }): Promise<void> {
  return request<void>('/api/support/report', {
    method: 'POST',
    body: JSON.stringify(details),
  })
}

export function deleteCustomerAccount(): Promise<void> {
  return request<void>('/api/account', { method: 'DELETE' })
}

export function loadCustomerNotifications(): Promise<CustomerNotification[]> {
  return request<CustomerNotification[]>('/api/customer/notifications')
}

export function loadPushPublicKey(): Promise<string> {
  return request<{ publicKey: string }>('/api/push/public-key').then((result) => result.publicKey)
}

export function savePushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  return request<void>('/api/push/subscriptions', {
    method: 'POST',
    body: JSON.stringify(subscription),
  })
}

export function sendPushTestNotification(): Promise<void> {
  return request<void>('/api/push/test', { method: 'POST' })
}

export function removePushSubscription(endpoint: string): Promise<void> {
  return request<void>('/api/push/subscriptions', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  })
}

export function loadGoogleBookings(): Promise<Booking[]> {
  return request<Booking[]>('/api/bookings')
}

export function loadGoogleFavorites(): Promise<string[]> {
  return request<string[]>('/api/favorites')
}

export function setGoogleFavorite(salonId: string, favorite: boolean): Promise<void> {
  return request<void>('/api/favorites', {
    method: 'PATCH',
    body: JSON.stringify({ salonId, favorite }),
  })
}

export function createGoogleBooking(
  booking: Pick<Booking, 'salonId' | 'serviceId' | 'staffId' | 'scheduledAt' | 'paymentMode'>,
): Promise<Booking> {
  return request<Booking>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(booking),
  })
}

export interface RazorpayOrder {
  orderId: string
  amount: number
  currency: string
  keyId: string
  businessName: string
  serviceName: string
  customerName: string
  customerEmail: string
  customerPhone: string
}

export interface RazorpayPaymentResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export function createRazorpayOrder(
  booking: Pick<Booking, 'salonId' | 'serviceId' | 'staffId' | 'scheduledAt'> & {
    acknowledgeDemoPayment?: boolean
  },
): Promise<RazorpayOrder> {
  return request<RazorpayOrder>('/api/payments/razorpay/order', {
    method: 'POST',
    body: JSON.stringify(booking),
  })
}

export function verifyRazorpayPayment(payment: RazorpayPaymentResponse): Promise<Booking> {
  return request<Booking>('/api/payments/razorpay/verify', {
    method: 'POST',
    body: JSON.stringify(payment),
  })
}

export type VendorService = ServiceItem & { id: string; active: boolean }

export interface PublicCatalog {
  salons: Salon[]
  services: ServiceItem[]
}

export function loadPublicCatalog(): Promise<PublicCatalog> {
  return request<PublicCatalog>('/api/catalog')
}

export function loadVendorServices(): Promise<VendorService[]> {
  return request<VendorService[]>('/api/vendor/services')
}

export function loadVendorBusinessProfile(): Promise<VendorBusinessProfile> {
  return request<VendorBusinessProfile>('/api/vendor/profile')
}

export function saveVendorBusinessProfile(
  profile: VendorBusinessProfile,
): Promise<VendorBusinessProfile> {
  return request<VendorBusinessProfile>('/api/vendor/profile', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  })
}

export function createVendorService(
  service: Omit<ServiceItem, 'id'> & { imageUrl: string },
): Promise<VendorService> {
  return request<VendorService>('/api/vendor/services', {
    method: 'POST',
    body: JSON.stringify({
      ...service,
      imageData: service.imageUrl,
    }),
  })
}

export function updateVendorService(
  id: string,
  patch: Partial<Pick<VendorService, 'name' | 'description' | 'price' | 'durationMin' | 'active'>>,
): Promise<VendorService> {
  return request<VendorService>(`/api/vendor/services/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function loadVendorStaff(): Promise<VendorStaff[]> {
  return request<VendorStaff[]>('/api/vendor/staff')
}

export function createVendorStaff(
  staff: Omit<VendorStaff, 'id' | 'active'>,
): Promise<VendorStaff> {
  return request<VendorStaff>('/api/vendor/staff', {
    method: 'POST',
    body: JSON.stringify(staff),
  })
}

export function updateVendorStaff(
  id: string,
  staff: Partial<Omit<VendorStaff, 'id'>>,
): Promise<VendorStaff> {
  return request<VendorStaff>(`/api/vendor/staff/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(staff),
  })
}

export function deleteVendorStaff(id: string): Promise<void> {
  return request<void>(`/api/vendor/staff/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function loadVendorBranches(): Promise<Branch[]> {
  return request<Branch[]>('/api/vendor/branches')
}

export function createVendorBranch(
  branch: Omit<Branch, 'id' | 'vendorId'>,
): Promise<Branch> {
  return request<Branch>('/api/vendor/branches', {
    method: 'POST',
    body: JSON.stringify(branch),
  })
}

export function updateVendorBranch(
  id: string,
  branch: Partial<Pick<Branch, 'name' | 'address' | 'seatCapacity' | 'serviceCapacityPerHour'>>,
): Promise<Branch> {
  return request<Branch>(`/api/vendor/branches/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(branch),
  })
}

export function loadVendorPreferences(): Promise<VendorPreferences> {
  return request<VendorPreferences>('/api/vendor/preferences')
}

export function saveVendorPreferences(preferences: VendorPreferences): Promise<VendorPreferences> {
  return request<VendorPreferences>('/api/vendor/preferences', {
    method: 'PATCH',
    body: JSON.stringify(preferences),
  })
}

export function loadVendorContent(kind: VendorContent['kind']): Promise<VendorContent[]> {
  return request<VendorContent[]>(`/api/vendor/content?kind=${kind}`)
}

export function createVendorContent(
  content: Omit<VendorContent, 'id' | 'createdAt'>,
): Promise<VendorContent> {
  return request<VendorContent>('/api/vendor/content', {
    method: 'POST',
    body: JSON.stringify(content),
  })
}

export function updateVendorContent(
  id: string,
  patch: Partial<Pick<VendorContent, 'active'>>,
): Promise<VendorContent> {
  return request<VendorContent>(`/api/vendor/content/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function deleteVendorContent(id: string): Promise<void> {
  return request<void>(`/api/vendor/content/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function loadVendorCustomers(): Promise<VendorCustomer[]> {
  return request<VendorCustomer[]>('/api/vendor/customers')
}

export function loadVendorBookings(): Promise<VendorBooking[]> {
  return request<VendorBooking[]>('/api/vendor/bookings')
}

export function updateVendorBookingStatus(
  id: string,
  status: Booking['status'],
): Promise<VendorBooking> {
  return request<VendorBooking>(`/api/vendor/bookings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
