import { useEffect, useState } from 'react'
import { loadPublicCatalog } from './api'
import type { Salon, ServiceItem } from './types'

export function usePublicCatalog() {
  const [salons, setSalons] = useState<Salon[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void loadPublicCatalog()
      .then((catalog) => {
        if (!active) return
        setSalons(catalog.salons)
        setServices(catalog.services)
        setError('')
      })
      .catch((err: unknown) => {
        console.error('Could not load public salon and service catalog:', err)
        if (active) {
          setSalons([])
          setServices([])
          setError('Live business listings are temporarily unavailable. Please try again later.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { salons, services, loading, error }
}
