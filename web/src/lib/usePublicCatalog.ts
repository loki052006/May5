import { useEffect, useState } from 'react'
import { loadPublicCatalog } from './api'
import { salons as sampleSalons, services as sampleServices } from './mockData'
import type { Salon, ServiceItem } from './types'

export function usePublicCatalog() {
  const [salons, setSalons] = useState<Salon[]>(sampleSalons)
  const [services, setServices] = useState<ServiceItem[]>(sampleServices)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void loadPublicCatalog()
      .then((catalog) => {
        if (!active) return
        const knownSalons = new Map(sampleSalons.map((salon) => [salon.id, salon]))
        const knownServices = new Map(sampleServices.map((service) => [service.id, service]))
        catalog.salons.forEach((salon) => knownSalons.set(salon.id, salon))
        catalog.services.forEach((service) => knownServices.set(service.id, service))
        setSalons([...knownSalons.values()])
        setServices([...knownServices.values()])
        setError('')
      })
      .catch((err: unknown) => {
        console.error('Could not load public salon and service catalog:', err)
        if (active) setError('Live business listings are temporarily unavailable. Showing sample listings.')
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
