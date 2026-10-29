import { useEffect, useState } from 'react'
import {
  createProviderSubscriptionOrder,
  loadVendorSubscription,
  verifyProviderSubscriptionPayment,
  type RazorpayPaymentResponse,
} from '../../lib/api'
import type { ProviderSubscription, VendorSubscriptionCatalog } from '../../lib/types'

interface RazorpayCheckoutOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill: { name: string; email: string; contact: string }
  handler: (response: RazorpayPaymentResponse) => void
  modal: { ondismiss: () => void }
  theme: { color: string }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void }
  }
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => window.Razorpay
      ? resolve()
      : reject(new Error('Payment checkout could not be initialized.'))
    script.onerror = () => reject(new Error('Could not load secure checkout. Check your connection and try again.'))
    document.head.appendChild(script)
  })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function VendorSubscriptionPage() {
  const [catalog, setCatalog] = useState<VendorSubscriptionCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [buyingPlan, setBuyingPlan] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function refreshSubscription() {
    try {
      setCatalog(await loadVendorSubscription())
    } catch (err) {
      console.error('Could not load provider subscription plans:', err)
      setError(err instanceof Error ? err.message : 'Could not load subscription plans.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    void loadVendorSubscription()
      .then((result) => {
        if (active) setCatalog(result)
      })
      .catch((err: unknown) => {
        console.error('Could not load provider subscription plans:', err)
        if (active) setError(err instanceof Error ? err.message : 'Could not load subscription plans.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function purchasePlan(planId: string) {
    setError('')
    setNotice('')
    setBuyingPlan(planId)
    try {
      const order = await createProviderSubscriptionOrder(planId)
      await loadRazorpayCheckout()
      if (!window.Razorpay) throw new Error('Secure checkout is unavailable. Please try again.')
      const payment = await new Promise<RazorpayPaymentResponse>((resolve, reject) => {
        const checkout = new window.Razorpay!({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'MAY5 Provider Plan',
          description: `${order.planName} subscription`,
          order_id: order.orderId,
          prefill: {
            name: order.providerName,
            email: order.providerEmail,
            contact: order.providerPhone,
          },
          handler: resolve,
          modal: { ondismiss: () => reject(new Error('Payment cancelled. You can choose a plan whenever you are ready.')) },
          theme: { color: '#c67139' },
        })
        checkout.open()
      })
      const subscription = await verifyProviderSubscriptionPayment(payment)
      if (!subscription) throw new Error('Payment was verified, but the subscription status could not be refreshed.')
      setCatalog((current) => current ? { ...current, subscription } : current)
      setNotice('Subscription activated. All provider features are now available.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not activate the subscription.')
    } finally {
      setBuyingPlan('')
    }
  }

  if (loading) return <p role="status">Loading subscription plans…</p>

  const activeSubscription: ProviderSubscription | null = catalog?.subscription ?? null
  const subscriptionActive = Boolean(activeSubscription)

  return (
    <div>
      <h1>MAY5 provider subscription</h1>
      <p style={{ color: 'var(--may5-muted)' }}>
        Choose a plan to unlock the complete MAY5 business toolkit. Your customers book services without paying through MAY5; service payments are handled directly with your business.
      </p>

      {subscriptionActive && (
        <div className="may5-card" style={{ padding: 16, margin: '16px 0' }}>
          <strong>Subscription active</strong>
          {activeSubscription && (
            <p style={{ marginBottom: 0 }}>
              Access is available until {formatDate(activeSubscription.expiresAt)}. Buying another plan extends access from your current expiry date.
            </p>
          )}
        </div>
      )}
      {notice && <p role="status" style={{ color: 'var(--may5-success)' }}>{notice}</p>}
      {error && <p role="alert" style={{ color: 'var(--may5-danger)' }}>{error}</p>}

      {!catalog ? (
        <button type="button" className="may5-btn" onClick={() => { setError(''); setLoading(true); void refreshSubscription() }}>
          Retry loading plans
        </button>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginTop: 20 }}>
          {catalog.plans.map((plan) => (
            <article key={plan.id} className="may5-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <h2 style={{ margin: 0 }}>{plan.name}</h2>
                {plan.discountPercent > 0 && (
                  <span className="may5-tag">Save {plan.discountPercent}%</span>
                )}
              </div>
              <p style={{ margin: 0 }}>
                <strong style={{ fontSize: '1.6rem' }}>₹{plan.priceRupees.toLocaleString('en-IN')}</strong>
                {plan.discountPercent > 0 && (
                  <span style={{ marginLeft: 8, color: 'var(--may5-muted)', textDecoration: 'line-through' }}>
                    ₹{plan.originalPriceRupees.toLocaleString('en-IN')}
                  </span>
                )}
              </p>
              <p style={{ margin: 0, color: 'var(--may5-muted)' }}>
                ₹{(plan.priceRupees / plan.durationMonths).toFixed(0)} per month · one-time payment for {plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'}
              </p>
              <ul style={{ paddingLeft: 20, margin: '4px 0', color: 'var(--may5-muted)' }}>
                <li>Services and photo galleries</li>
                <li>Bookings, calendar, and staff</li>
                <li>Business profile and customer tools</li>
                <li>Analytics and promotions</li>
              </ul>
              <button
                type="button"
                className="may5-btn may5-btn-primary"
                disabled={Boolean(buyingPlan)}
                onClick={() => void purchasePlan(plan.id)}
                style={{ marginTop: 'auto' }}
              >
                {buyingPlan === plan.id ? 'Opening secure checkout…' : `Choose ${plan.name}`}
              </button>
            </article>
          ))}
        </div>
      )}
      <p style={{ marginTop: 16, color: 'var(--may5-muted)', fontSize: '0.85rem' }}>
        Prices are in INR and include the listed plan term. Plans do not auto-renew; renew when you choose. Payment is securely processed by Razorpay.
      </p>
    </div>
  )
}
