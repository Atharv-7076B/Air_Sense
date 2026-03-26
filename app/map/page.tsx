'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Header } from '@/components/layout'
import { Card, CardContent, Badge, CardSkeleton } from '@/components/ui'
import { CitySearch } from '@/components/ui/city-search'
import { getAQICategory, type AQIData } from '@/lib/aqi-client'
import type { CitySearchResult } from '@/lib/city-search'
import { motion } from 'framer-motion'
import { MapPin, Wind, Droplets, Thermometer, Locate } from 'lucide-react'

// Dynamically import map to avoid SSR issues with Leaflet
const AQIMap = dynamic(() => import('@/components/map/aqi-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] rounded-lg bg-muted/30 flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading map...</p>
    </div>
  ),
})

interface MapLocation {
  name: string
  lat: number
  lon: number
  aqi?: AQIData
}

export default function MapPage() {
  const [locations, setLocations] = useState<MapLocation[]>([])
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null)
  const [center, setCenter] = useState<[number, number]>([20.5937, 78.9629]) // India center
  const [isLoading, setIsLoading] = useState(false)

  // Load default cities with real AQI
  useEffect(() => {
    const defaultCities: MapLocation[] = [
      { name: 'Delhi', lat: 28.6139, lon: 77.209 },
      { name: 'Mumbai', lat: 19.076, lon: 72.8777 },
      { name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
      { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
      { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
      { name: 'Hyderabad', lat: 17.385, lon: 78.4867 },
    ]

    const loadAQI = async () => {
      const withAQI = await Promise.all(
        defaultCities.map(async (city) => {
          try {
            const res = await fetch(`/api/aqi?city=${encodeURIComponent(city.name)}`)
            const result = await res.json()
            return { ...city, aqi: result.data || undefined }
          } catch {
            return city
          }
        })
      )
      setLocations(withAQI)
    }
    loadAQI()
  }, [])

  const handleCitySelect = useCallback(async (city: CitySearchResult) => {
    setIsLoading(true)

    let aqi: AQIData | undefined
    try {
      const res = await fetch(`/api/aqi?city=${encodeURIComponent(city.name)}`)
      const result = await res.json()
      aqi = result.data
    } catch {
      // No AQI data available
    }

    const newLocation: MapLocation = {
      name: city.name,
      lat: city.lat,
      lon: city.lon,
      aqi,
    }

    setLocations(prev => {
      const exists = prev.find(l =>
        Math.abs(l.lat - city.lat) < 0.01 && Math.abs(l.lon - city.lon) < 0.01
      )
      if (exists) return prev
      return [...prev, newLocation]
    })

    setSelectedLocation(newLocation)
    setCenter([city.lat, city.lon])
    setIsLoading(false)
  }, [])

  const handleMapClick = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(`/api/city-search?q=${lat},${lon}&limit=1`)
      const data = await res.json()
      if (data.results?.length > 0) {
        const city = data.results[0]
        handleCitySelect(city)
      }
    } catch {
      // Ignore click errors
    }
  }, [handleCitySelect])

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          const res = await fetch(`/api/city-search?q=${latitude},${longitude}&limit=1`)
          const data = await res.json()
          if (data.results?.length > 0) {
            handleCitySelect(data.results[0])
          } else {
            setCenter([latitude, longitude])
          }
        } catch {
          setCenter([latitude, longitude])
        }
      },
      () => {
        // Geolocation denied
      }
    )
  }, [handleCitySelect])

  const selectedCategory = selectedLocation?.aqi
    ? getAQICategory(selectedLocation.aqi.aqi)
    : null

  return (
    <div className="min-h-screen">
      <Header
        title="AQI Map"
        subtitle="Explore air quality across cities"
      />

      <div className="p-6 space-y-6">
        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-4"
        >
          <CitySearch
            value=""
            onSelect={handleCitySelect}
            placeholder="Search a city to add to map..."
            className="w-80"
          />
          <button
            onClick={handleLocateMe}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Locate className="w-4 h-4" />
            My Location
          </button>
        </motion.div>

        {/* Map + Details */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0 overflow-hidden rounded-lg">
                <AQIMap
                  locations={locations}
                  center={center}
                  onLocationSelect={(loc) => setSelectedLocation(loc)}
                  onMapClick={handleMapClick}
                />
              </CardContent>
            </Card>
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            {isLoading ? (
              <CardSkeleton />
            ) : selectedLocation?.aqi ? (
              <motion.div
                key={selectedLocation.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">
                        {selectedLocation.name}
                      </h3>
                    </div>

                    <div className="text-center py-4">
                      <p className="text-5xl font-bold text-foreground">
                        {selectedLocation.aqi.aqi}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">AQI</p>
                      {selectedCategory && (
                        <Badge
                          variant={
                            selectedLocation.aqi.aqi <= 50 ? 'success' :
                            selectedLocation.aqi.aqi <= 100 ? 'warning' : 'danger'
                          }
                          className="mt-2"
                        >
                          {selectedCategory.level}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <PollutantItem
                        label="PM2.5"
                        value={selectedLocation.aqi.pm25}
                        unit="µg/m³"
                        icon={<Wind className="w-3.5 h-3.5" />}
                      />
                      <PollutantItem
                        label="PM10"
                        value={selectedLocation.aqi.pm10}
                        unit="µg/m³"
                        icon={<Wind className="w-3.5 h-3.5" />}
                      />
                      <PollutantItem
                        label="Temp"
                        value={selectedLocation.aqi.temperature}
                        unit="°C"
                        icon={<Thermometer className="w-3.5 h-3.5" />}
                      />
                      <PollutantItem
                        label="Humidity"
                        value={selectedLocation.aqi.humidity}
                        unit="%"
                        icon={<Droplets className="w-3.5 h-3.5" />}
                      />
                    </div>

                    {selectedCategory && (
                      <p className="text-xs text-muted-foreground">
                        {selectedCategory.healthImplications}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Select a city on the map or search above to view AQI details
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Legend */}
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">AQI Scale</p>
                <div className="space-y-1.5">
                  {[
                    { range: '0-50', label: 'Good', color: 'bg-emerald-500' },
                    { range: '51-100', label: 'Moderate', color: 'bg-yellow-500' },
                    { range: '101-150', label: 'Unhealthy (Sensitive)', color: 'bg-orange-500' },
                    { range: '151-200', label: 'Unhealthy', color: 'bg-red-500' },
                    { range: '201-300', label: 'Very Unhealthy', color: 'bg-purple-500' },
                    { range: '300+', label: 'Hazardous', color: 'bg-rose-900' },
                  ].map(item => (
                    <div key={item.range} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-xs text-muted-foreground">
                        {item.range}: {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function PollutantItem({
  label,
  value,
  unit,
  icon,
}: {
  label: string
  value: number | null
  unit: string
  icon: React.ReactNode
}) {
  return (
    <div className="p-2 rounded-lg bg-muted/30">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-semibold text-foreground">
        {value !== null ? value : '—'}
        <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
      </p>
    </div>
  )
}
