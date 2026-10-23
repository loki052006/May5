import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Salon } from '../../lib/types'

const defaultCenter: L.LatLngExpression = [12.9716, 77.5946]

function hasMapCoordinates(salon: Salon) {
  return Number.isFinite(salon.lat) &&
    Number.isFinite(salon.lng) &&
    Math.abs(salon.lat) <= 90 &&
    Math.abs(salon.lng) <= 180 &&
    (salon.lat !== 0 || salon.lng !== 0)
}

export function SalonMap({ salons, selectedId, onSelect }: {
  salons: Salon[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const locationMarkerRef = useRef<L.CircleMarker | null>(null)
  const [locationError, setLocationError] = useState('')

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const located = salons.filter(hasMapCoordinates)
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
      located.length ? [located[0].lat, located[0].lng] : defaultCenter,
      located.length ? 12 : 11,
    )
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    if (located.length > 1) {
      map.fitBounds(located.map((salon) => [salon.lat, salon.lng]), { padding: [24, 24], maxZoom: 13 })
    }
    mapRef.current = map
    const resize = () => map.invalidateSize()
    window.setTimeout(resize, 0)
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [salons])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const markers = L.layerGroup().addTo(map)
    salons.forEach((salon) => {
      if (!hasMapCoordinates(salon)) return
      const marker = L.marker([salon.lat, salon.lng], {
        icon: L.divIcon({
          className: 'may5-map-pin',
          html: `<span>${salon.name.replace(/[&<>"']/g, '')}</span>`,
          iconSize: [32, 38],
          iconAnchor: [16, 36],
        }),
      }).addTo(markers)
      marker.bindPopup(`<strong>${salon.name.replace(/[&<>"']/g, '')}</strong><br>${salon.address.replace(/[&<>"']/g, '')}`)
      marker.on('click', () => onSelect(salon.id))
      if (salon.id === selectedId) marker.openPopup()
    })
    return () => { markers.remove() }
  }, [salons, selectedId, onSelect])

  function showMyLocation() {
    if (!navigator.geolocation) {
      setLocationError('Location is not supported by this browser.')
      return
    }
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point: L.LatLngExpression = [coords.latitude, coords.longitude]
        const map = mapRef.current
        if (!map) return
        map.setView(point, 14)
        locationMarkerRef.current?.remove()
        locationMarkerRef.current = L.circleMarker(point, {
          radius: 8,
          color: '#fff',
          weight: 3,
          fillColor: '#2877d4',
          fillOpacity: 1,
        }).addTo(map).bindPopup('Your current location')
      },
      (error) => {
        console.error('Could not get customer location:', error)
        setLocationError(error.code === error.PERMISSION_DENIED
          ? 'Allow location access to center the map near you.'
          : 'Could not determine your location. Try again.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  return (
    <div className="salon-map-wrap">
      <div ref={containerRef} className="salon-map" role="region" aria-label="Map of salons" />
      <button type="button" className="salon-map-location" onClick={showMyLocation}>Use my location</button>
      {locationError && <p className="salon-map-error" role="status">{locationError}</p>}
      {salons.every((salon) => !hasMapCoordinates(salon)) && (
        <p className="salon-map-note">Businesses can add their map pin from business settings.</p>
      )}
    </div>
  )
}
