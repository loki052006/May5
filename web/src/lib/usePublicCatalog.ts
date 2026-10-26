import { useEffect, useState } from 'react'
import { loadPublicCatalog } from './api'
import { salons as sampleSalons, services as sampleServices } from './mockData'
import type { Salon, ServiceItem } from './types'

export function usePublicCatalog() {
  const [salons, setSalons] = useState<Salon[]>(() =>
    sampleSalons.map((salon) => ({ ...salon, homeService: false, demoListing: true })),
  )
  const [services, setServices] = useState<ServiceItem[]>(() =>
    sampleServices.map((service) => ({ ...service, homeService: false })),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void loadPublicCatalog()
      .then((catalog) => {
        if (!active) return
        const knownSalons = new Map<string, Salon>(
          sampleSalons.map((salon): [string, Salon] => [
            salon.id,
            { ...salon, homeService: false, demoListing: true },
          ]),
        )
        const knownServices = new Map(sampleServices.map((service) => [
          service.id,
          { ...service, homeService: false },
        ]))
        catalog.salons.forEach((salon) => knownSalons.set(salon.id, { ...salon, homeService: false }))
        catalog.services.forEach((service) => knownServices.set(service.id, { ...service, homeService: false }))
        setSalons([...knownSalons.values()])
        setServices([...knownServices.values()])
        setError('')
      })
      .catch((err: unknown) => {
        console.error('Could not load public salon and service catalog:', err)
        if (active) {
          setSalons(sampleSalons.map((salon) => ({ ...salon, homeService: false, demoListing: true })))
          setServices(sampleServices.map((service) => ({ ...service, homeService: false })))
          setError('Live business listings are temporarily unavailable. Showing demo listings.')
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
