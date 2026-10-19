import type { Booking, Branch, Salon, ServiceItem, UserProfile, UserRole, VendorBusinessProfile, VendorStaff } from './types'

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

export type VendorService = ServiceItem & { id: string }

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
