'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import type { AQIData } from '@/lib/aqi-client'
import 'leaflet/dist/leaflet.css'

interface MapLocation {
  name: string
  lat: number
  lon: number
  aqi?: AQIData
}

interface AQIMapProps {
  locations: MapLocation[]
  center: [number, number]
  onLocationSelect?: (location: MapLocation) => void
  onMapClick?: (lat: number, lon: number) => void
}

function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#22c55e'
  if (aqi <= 100) return '#eab308'
  if (aqi <= 150) return '#f97316'
  if (aqi <= 200) return '#ef4444'
  if (aqi <= 300) return '#a855f7'
  return '#881337'
}

function getAQIRadius(aqi: number): number {
  if (aqi <= 50) return 12
  if (aqi <= 100) return 15
  if (aqi <= 150) return 18
  if (aqi <= 200) return 21
  if (aqi <= 300) return 24
  return 28
}

// Component to update map center when it changes
function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  const prevCenter = useRef(center)

  useEffect(() => {
    if (prevCenter.current[0] !== center[0] || prevCenter.current[1] !== center[1]) {
      map.flyTo(center, 10, { duration: 1 })
      prevCenter.current = center
    }
  }, [center, map])

  return null
}

export default function AQIMap({
  locations,
  center,
  onLocationSelect,
}: AQIMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={5}
      style={{ height: '500px', width: '100%' }}
      className="rounded-lg z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapCenterUpdater center={center} />

      {locations.map((location) => {
        const aqi = location.aqi?.aqi || 100
        return (
          <CircleMarker
            key={`${location.name}-${location.lat}-${location.lon}`}
            center={[location.lat, location.lon]}
            radius={getAQIRadius(aqi)}
            fillColor={getAQIColor(aqi)}
            color={getAQIColor(aqi)}
            weight={2}
            opacity={0.8}
            fillOpacity={0.5}
            eventHandlers={{
              click: () => onLocationSelect?.(location),
            }}
          >
            <Popup>
              <div className="text-center p-1">
                <p className="font-semibold text-sm">{location.name}</p>
                <p className="text-lg font-bold" style={{ color: getAQIColor(aqi) }}>
                  AQI: {aqi}
                </p>
                {location.aqi?.pm25 && (
                  <p className="text-xs text-gray-500">PM2.5: {location.aqi.pm25} µg/m³</p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
