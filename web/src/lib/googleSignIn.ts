export interface GoogleUserPayload {
  id: string
  email: string
  fullName: string
  avatarUrl: string
  phone: string
  role: 'customer' | 'vendor' | 'admin'
  authProvider: 'google'
  age?: number
  gender?: string
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

type CodeClient = {
  requestCode: () => void
}

type GsiOAuth2 = {
  initCodeClient: (config: {
    client_id: string
    scope: string
    ux_mode: 'popup' | 'redirect'
    callback: (response: { code?: string; error?: string }) => void
  }) => CodeClient
}

declare global {
  interface Window {
    google?: { accounts: { oauth2: GsiOAuth2 } }
  }
}

let scriptLoad: Promise<void> | null = null

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (!scriptLoad) {
    scriptLoad = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-may5-gsi]')
      if (existing) {
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('Google script failed')))
        return
      }
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.dataset.may5Gsi = '1'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Could not load Google Sign-In'))
      document.head.appendChild(script)
    })
  }
  return scriptLoad
}

export function isGoogleSignInConfigured(): boolean {
  return Boolean(CLIENT_ID?.trim())
}

export async function signInWithGooglePopup(): Promise<GoogleUserPayload> {
  if (!CLIENT_ID?.trim()) {
    throw new Error('Google Client ID is not configured (VITE_GOOGLE_CLIENT_ID).')
  }

  await loadGsiScript()
  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) throw new Error('Google Sign-In is unavailable')

  const code = await new Promise<string>((resolve, reject) => {
    const popupTimeout = window.setTimeout(() => {
      reject(new Error('Google sign-in popup did not complete. Allow pop-ups for this site and try again.'))
    }, 60_000)
    const client = oauth2.initCodeClient({
      client_id: CLIENT_ID,
      scope: 'openid email profile',
      ux_mode: 'popup',
      callback: (response) => {
        window.clearTimeout(popupTimeout)
        if (response.error) {
          if (response.error === 'origin_mismatch') {
            reject(new Error(
              `Google sign-in is not enabled for ${window.location.origin}. Add this exact origin to the Authorized JavaScript origins for the MAY5 Google OAuth web client, save the change, and try again.`,
            ))
            return
          }
          reject(new Error(response.error))
          return
        }
        if (!response.code) {
          reject(new Error('Sign-in was cancelled'))
          return
        }
        resolve(response.code)
      },
    })
    client.requestCode()
  })

  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Google sign-in failed on server')
  }

  return (await res.json()) as GoogleUserPayload
}
