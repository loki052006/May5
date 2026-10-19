const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

export function formatINR(amount: number): string {
  return inrFormatter.format(amount)
}

export function formatIndianDate(value: string | number | Date): string {
  return new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatIndianDateOnly(value: string | number | Date): string {
  return new Date(value).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatIndianPhone(phone?: string): string {
  if (!phone) return 'Not provided'
  const digits = phone.replace(/\D/g, '')
  const nationalNumber = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits
  if (/^[6-9]\d{9}$/.test(nationalNumber)) {
    return `+91 ${nationalNumber.slice(0, 5)} ${nationalNumber.slice(5)}`
  }
  return phone
}
