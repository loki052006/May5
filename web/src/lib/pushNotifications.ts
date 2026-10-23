import { loadPushPublicKey, removePushSubscription, savePushSubscription } from './api'

function decodeVapidPublicKey(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  new Uint8Array(buffer).set(Array.from(raw, (character) => character.charCodeAt(0)))
  return buffer
}

export async function enableBrowserPushNotifications(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    throw new Error('Push notifications are not supported by this browser.')
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(permission === 'denied'
      ? 'Notifications are blocked in your browser settings.'
      : 'Allow notifications to receive MAY5 booking updates.')
  }
  const registration = await navigator.serviceWorker.register('/service-worker.js')
  await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    const publicKey = await loadPushPublicKey()
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidPublicKey(publicKey),
    })
  }
  await savePushSubscription(subscription.toJSON())
}

export async function disableBrowserPushNotifications(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration('/service-worker.js')
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  await removePushSubscription(subscription.endpoint)
  await subscription.unsubscribe()
}
