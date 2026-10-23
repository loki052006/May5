self.addEventListener('push', (event) => {
  let notification = { title: 'MAY5 update', body: 'You have a new update.', url: '/customer/profile/notifications' }
  if (event.data) {
    try {
      notification = { ...notification, ...event.data.json() }
    } catch (error) {
      console.error('Could not read push notification payload:', error)
    }
  }
  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: notification.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destination = event.notification.data?.url || '/customer/profile/notifications'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => new URL(client.url).origin === self.location.origin)
      if (existing) {
        existing.navigate(destination)
        return existing.focus()
      }
      return self.clients.openWindow(destination)
    }),
  )
})
