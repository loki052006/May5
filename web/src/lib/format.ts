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

export function isSalonOpenNow(openingHours?: string, now = new Date()): boolean {
  if (!openingHours) return false
  const weekdayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const currentDay = weekdayNames[now.getDay()]
  const dayRange = openingHours.match(/\b(sun|mon|tue|wed|thu|fri|sat)\s*[-–]\s*(sun|mon|tue|wed|thu|fri|sat)\b/i)
  if (dayRange) {
    const start = weekdayNames.indexOf(dayRange[1].toLowerCase())
    const end = weekdayNames.indexOf(dayRange[2].toLowerCase())
    const current = weekdayNames.indexOf(currentDay)
    const scheduledToday = start <= end
      ? current >= start && current <= end
      : current >= start || current <= end
    if (!scheduledToday) return false
  } else if (/\b(sun|mon|tue|wed|thu|fri|sat)\b/i.test(openingHours)) {
    const listedDays = [...openingHours.matchAll(/\b(sun|mon|tue|wed|thu|fri|sat)\b/gi)].map((match) => match[1].toLowerCase())
    if (!listedDays.includes(currentDay)) return false
  }
  const match = openingHours.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)
  if (!match) return false

  function minutesOfDay(value: string): number | null {
    const parts = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
    if (!parts) return null
    let hour = Number(parts[1])
    const minute = Number(parts[2] ?? 0)
    const meridiem = parts[3]?.toLowerCase()
    if (hour > 23 || minute > 59 || (meridiem && (hour < 1 || hour > 12))) return null
    if (meridiem === 'pm' && hour !== 12) hour += 12
    if (meridiem === 'am' && hour === 12) hour = 0
    return hour * 60 + minute
  }

  const opening = minutesOfDay(match[1])
  const closing = minutesOfDay(match[2])
  if (opening === null || closing === null) return false
  const current = now.getHours() * 60 + now.getMinutes()
  return closing >= opening
    ? current >= opening && current < closing
    : current >= opening || current < closing
}
