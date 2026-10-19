import type { Booking, Branch, Salon, ServiceItem, StaffMember } from './types'

export const salons: Salon[] = [
  {
    id: 'salon-1',
    name: 'Glamour Wave Salon',
    address: '12th Main Road, Indiranagar, Bengaluru',
    rating: 4.9,
    coverImage:
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
    promo: 'Enjoy 25% off for your next booking',
    homeService: true,
    onlineServices: true,
    lat: 12.9784,
    lng: 77.6408,
    branchId: 'branch-1',
  },
  {
    id: 'salon-2',
    name: 'Elegance Salon',
    address: 'MG Road, Bengaluru',
    rating: 4.8,
    coverImage:
      'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80',
    homeService: false,
    onlineServices: true,
    lat: 12.9756,
    lng: 77.6066,
    branchId: 'branch-1',
  },
  {
    id: 'salon-3',
    name: 'Urban Glow Studio',
    address: '80 Feet Road, Koramangala, Bengaluru',
    rating: 4.7,
    coverImage:
      'https://images.unsplash.com/photo-1633681926022-84c23e8cb59d?w=800&q=80',
    promo: 'Special offer — ladies only filter in Explore',
    homeService: true,
    onlineServices: false,
    lat: 12.9352,
    lng: 77.6245,
    branchId: 'branch-2',
  },
]

export const services: ServiceItem[] = [
  {
    id: 'svc-1',
    salonId: 'salon-2',
    name: "Women's Haircut",
    price: 650,
    durationMin: 90,
    category: 'popular',
    homeService: false,
  },
  {
    id: 'svc-2',
    salonId: 'salon-2',
    name: 'Balayage Color',
    price: 1800,
    durationMin: 150,
    category: 'popular',
    homeService: false,
  },
  {
    id: 'svc-3',
    salonId: 'salon-2',
    name: 'At-home Blowout',
    price: 850,
    durationMin: 60,
    category: 'other',
    homeService: true,
  },
  {
    id: 'svc-4',
    salonId: 'salon-1',
    name: 'Blowout',
    price: 790,
    durationMin: 45,
    category: 'popular',
    homeService: true,
  },
]

export const staff: StaffMember[] = [
  {
    id: 'staff-1',
    salonId: 'salon-1',
    fullName: 'Harper Lawson',
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    rating: 4.9,
  },
  {
    id: 'staff-2',
    salonId: 'salon-1',
    fullName: 'Priya Nair',
    avatarUrl:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
    rating: 4.8,
  },
]

export const branches: Branch[] = [
  {
    id: 'branch-1',
    vendorId: 'vendor-demo',
    name: 'Indiranagar',
    address: 'Bengaluru',
    seatCapacity: 8,
    serviceCapacityPerHour: 12,
  },
  {
    id: 'branch-2',
    vendorId: 'vendor-demo',
    name: 'Koramangala',
    address: 'Bengaluru',
    seatCapacity: 5,
    serviceCapacityPerHour: 8,
  },
]

export const initialBookings: Booking[] = [
  {
    id: 'bk-1',
    customerId: 'user-demo',
    salonId: 'salon-1',
    serviceId: 'svc-4',
    staffId: 'staff-1',
    status: 'scheduled',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    paymentMode: 'online',
    mediaAuthorized: true,
    mediaUrls: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
    ],
  },
]

export const serviceCategories = [
  { id: 'hair', label: 'Hair Salon', icon: 'scissors' },
  { id: 'nails', label: 'Nails', icon: 'sparkles' },
  { id: 'spa', label: 'Spa', icon: 'flower' },
  { id: 'makeup', label: 'Makeup', icon: 'brush' },
]

export const specialOffers = [
  {
    id: 'off-1',
    title: 'Summer Glow Package',
    image:
      'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=600&q=80',
  },
  {
    id: 'off-2',
    title: '25% Off Color',
    image:
      'https://images.unsplash.com/photo-1522336572468-97b06e3baf46?w=600&q=80',
  },
]
