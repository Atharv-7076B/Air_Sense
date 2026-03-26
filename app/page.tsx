'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Header } from '@/components/layout'
import {
  ExposureScore,
  QuickStats,
  AQICard,
  InsightsCard,
} from '@/components/dashboard'
import { ScoreCards } from '@/components/dashboard/score-cards'
import { GPSIComparison } from '@/components/dashboard/gpsi-comparison'
import { ForecastCard } from '@/components/dashboard/forecast-card'
import { ActivityTimeline } from '@/components/simulator'
import { Badge, CardSkeleton } from '@/components/ui'
import { CitySearch } from '@/components/ui/city-search'
import {
  calculateExposure,
  type ExposureResult
} from '@/lib/exposure-calculator'
import {
  type AQIData
} from '@/lib/aqi-client'
import type { CitySearchResult } from '@/lib/city-search'
import { cachedFetch } from '@/lib/client-cache'
import {
  generateDayActivities,
  type ActivityData
} from '@/lib/wearable-simulator'
import { motion } from 'framer-motion'
import { Wifi } from 'lucide-react'

export default function DashboardPage() {
  const [city, setCity] = useState('Mumbai')
  const [hasAC, setHasAC] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  const [aqiData, setAqiData] = useState<AQIData | null>(null)
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [exposure, setExposure] = useState<ExposureResult | null>(null)
  const [dataSource, setDataSource] = useState<string>('simulated')

  const refreshData = useCallback(async () => {
    setIsLoading(true)

    try {
      // Try API first (which uses Fitbit data when available)
      const data = await cachedFetch<{ exposure: ExposureResult; cityAQI: AQIData; dataSource: string }>(`/api/exposure?city=${city}&hasAC=${hasAC}&homeType=apartment`, { ttl: 15 * 60 * 1000 })

      if (data.exposure && data.cityAQI) {
        setAqiData(data.cityAQI)
        setExposure(data.exposure)
        setDataSource(data.dataSource || 'simulated')

        // If Fitbit data, also fetch activities for timeline
        if (data.dataSource === 'fitbit') {
          try {
            const fitbitRes = await fetch('/api/fitbit/data?type=summary')
            const fitbitData = await fitbitRes.json()
            if (fitbitData.activities?.length > 0) {
              setActivities(fitbitData.activities.map((a: ActivityData & { timestamp: string }) => ({
                ...a,
                timestamp: new Date(a.timestamp),
              })))
            } else {
              setActivities(generateDayActivities(new Date()))
            }
          } catch {
            setActivities(generateDayActivities(new Date()))
          }
        } else {
          setActivities(generateDayActivities(new Date()))
        }

        setIsLoading(false)
        return
      }
    } catch {
      // API failed, fall back to client-side calculation
    }

    // Fallback: try /api/aqi for real data, then calculate client-side
    let newAQI: AQIData | null = null
    try {
      const aqiResult = await cachedFetch<{ data: AQIData }>(`/api/aqi?city=${encodeURIComponent(city)}`)
      if (aqiResult.data) newAQI = aqiResult.data
    } catch {
      // Will use simulated below
    }
    if (!newAQI) {
      const { getSimulatedAQI } = await import('@/lib/aqi-client')
      newAQI = getSimulatedAQI(city)
    }
    const newActivities = generateDayActivities(new Date())
    const newExposure = calculateExposure({
      baseAQI: newAQI.aqi,
      activities: newActivities,
      hasAC,
      homeType: 'apartment',
    })

    setAqiData(newAQI)
    setActivities(newActivities)
    setExposure(newExposure)
    setDataSource(newAQI.source || 'simulated')
    setIsLoading(false)
  }, [city, hasAC])

  const isInitialMount = useRef(true)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      refreshData()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh when city or AC changes
  useEffect(() => {
    if (!isInitialMount.current) {
      refreshData()
    }
  }, [city, hasAC]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCitySelect = useCallback((result: CitySearchResult) => {
    setCity(result.name)
  }, [])

  return (
    <div className="min-h-screen">
      <Header
        title="Dashboard"
        subtitle={`Your personalized air quality exposure for ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
      />

      <div className="p-6 space-y-6">
        {/* City selector + data source indicator */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-4"
        >
          <CitySearch
            value={city}
            onSelect={handleCitySelect}
            label="Your City"
            className="w-64"
            loading={isLoading}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasAC}
              onChange={(e) => setHasAC(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-foreground">Home has AC</span>
          </label>

          {!isLoading && dataSource === 'fitbit' && (
            <div className="flex items-center gap-1.5 ml-auto">
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              <Badge variant="success" size="sm">Fitbit Live Data</Badge>
            </div>
          )}
          {!isLoading && dataSource !== 'fitbit' && (
            <div className="ml-auto">
              <Badge size="sm">Estimated Data</Badge>
            </div>
          )}
        </motion.div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CardSkeleton />
              </div>
              <CardSkeleton />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Main exposure section */}
            <div className="grid lg:grid-cols-3 gap-6">
              {exposure && aqiData && (
                <ExposureScore
                  exposure={exposure}
                  cityAQI={aqiData.aqi}
                  className="lg:col-span-2"
                />
              )}
              {aqiData && (
                <AQICard
                  data={aqiData}
                  onRefresh={refreshData}
                  isLoading={isLoading}
                />
              )}
            </div>

            {/* Resilience & Fitness Scores */}
            <ScoreCards />

            {/* Forecast & GPSI */}
            <div className="grid lg:grid-cols-2 gap-6">
              <ForecastCard city={city} />
              <GPSIComparison city={city} />
            </div>

            {/* Quick stats */}
            {exposure && (
              <QuickStats
                indoorPercent={exposure.indoorPercent}
                avgActivityLevel={exposure.avgActivityLevel}
                totalSteps={exposure.totalSteps}
                avgHeartRate={exposure.avgHeartRate}
              />
            )}

            {/* Insights and activity */}
            <div className="grid lg:grid-cols-2 gap-6">
              {exposure && (
                <InsightsCard
                  insights={exposure.insights}
                  riskCategory={exposure.riskCategory}
                />
              )}
              {activities.length > 0 && (
                <div>
                  {dataSource === 'fitbit' && (
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="success" size="sm">Real Activity Data</Badge>
                      <span className="text-xs text-muted-foreground">From Fitbit</span>
                    </div>
                  )}
                  <ActivityTimeline activities={activities} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
