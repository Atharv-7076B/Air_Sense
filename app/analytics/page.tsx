'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Header } from '@/components/layout'
import {
  ExposureTrendChart,
  ActivityBreakdownChart,
  HourlyExposureChart,
  WeeklySummaryChart,
  SustainabilityChart,
} from '@/components/charts'
import { Card, CardContent, ChartSkeleton, Badge } from '@/components/ui'
import { CitySearch } from '@/components/ui/city-search'
import {
  calculateExposure,
  calculateWeeklyTrend
} from '@/lib/exposure-calculator'
import { getSimulatedAQI, type AQIData } from '@/lib/aqi-client'
import { cachedFetch } from '@/lib/client-cache'
import type { CitySearchResult } from '@/lib/city-search'
import { generateWeeklyData, generateDayActivities, type ActivityData, type DailyActivitySummary } from '@/lib/wearable-simulator'
import { motion } from 'framer-motion'
import { Calendar, TrendingUp, Activity, Clock, Leaf, Loader2, CloudSun } from 'lucide-react'
import type { HistoricalDataPoint, YearComparison, TrendSummary } from '@/lib/historical-aqi'

export default function AnalyticsPage() {
  const [city, setCity] = useState('Mumbai')
  const [isLoading, setIsLoading] = useState(true)
  const [weeklyTrendData, setWeeklyTrendData] = useState<{
    date: string
    personalScore: number
    cityAQI: number
  }[]>([])
  const [activityData, setActivityData] = useState<{
    activity: string
    minutes: number
    indoor: boolean
  }[]>([])
  const [hourlyData, setHourlyData] = useState<{
    hour: number
    exposure: number
  }[]>([])
  const [weeklySummary, setWeeklySummary] = useState<{
    day: string
    steps: number
    activeMinutes: number
    indoorPercent: number
  }[]>([])
  const [trend, setTrend] = useState<{
    trend: 'improving' | 'stable' | 'worsening'
    changePercent: number
    average: number
  }>({ trend: 'stable', changePercent: 0, average: 0 })

  // Historical sustainability data
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([])
  const [yearOverYear, setYearOverYear] = useState<YearComparison[]>([])
  const [historicalSummary, setHistoricalSummary] = useState<TrendSummary | null>(null)
  const [historicalLoading, setHistoricalLoading] = useState(false)
  const [historicalError, setHistoricalError] = useState<string | null>(null)

  // ARIMA forecast data
  const [forecastData, setForecastData] = useState<{
    historical: { date: string; aqi: number }[]
    forecast: { date: string; value: number; lower_bound: number; upper_bound: number }[]
    model?: { order: string; aic: number; rmse: number }
  } | null>(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [forecastIsARIMA, setForecastIsARIMA] = useState(false)

  const [dataSource, setDataSource] = useState<'fitbit' | 'simulated'>('simulated')

  // Try to fetch real Fitbit data for a given date
  const fetchFitbitDay = async (date: Date): Promise<{ activities: ActivityData[]; summary: DailyActivitySummary } | null> => {
    try {
      const dateStr = date.toISOString().split('T')[0]
      const res = await fetch(`/api/fitbit/data?type=summary&date=${dateStr}`)
      if (!res.ok) return null
      const result = await res.json()
      if (!result.connected || !result.activities?.length) return null

      const activities: ActivityData[] = result.activities
      const totalSteps = activities.reduce((s, a) => s + (a.steps || 0), 0)
      const totalCalories = activities.reduce((s, a) => s + (a.calories || 0), 0)
      const avgHeartRate = activities.length > 0
        ? Math.round(activities.reduce((s, a) => s + a.heartRate, 0) / activities.length)
        : 70
      const activeMinutes = activities
        .filter(a => !['sleeping', 'resting'].includes(a.activityType))
        .reduce((s, a) => s + a.duration, 0)
      const indoorTime = activities.filter(a => a.isIndoor).reduce((s, a) => s + a.duration, 0)
      const totalTime = activities.reduce((s, a) => s + a.duration, 0)

      return {
        activities,
        summary: {
          date,
          totalSteps,
          totalCalories,
          avgHeartRate,
          activeMinutes,
          indoorPercent: totalTime > 0 ? (indoorTime / totalTime) * 100 : 0,
          activities,
        },
      }
    } catch {
      return null
    }
  }

  const loadData = async () => {
    setIsLoading(true)

    // Fetch real AQI data (cached 30 min)
    let aqiData: AQIData
    try {
      const result = await cachedFetch<{ data: AQIData }>(`/api/aqi?city=${encodeURIComponent(city)}`)
      aqiData = result.data || getSimulatedAQI(city)
    } catch {
      aqiData = getSimulatedAQI(city)
    }

    // Try Fitbit first for activity data
    let weeklyData: DailyActivitySummary[] | null = null
    let todayActivities: ActivityData[] | null = null

    try {
      const status = await cachedFetch<{ connected: boolean }>('/api/fitbit/status', { ttl: 5 * 60 * 1000 })

      if (status.connected) {
        // Fetch last 7 days from Fitbit
        const days: DailyActivitySummary[] = []
        const today = new Date()
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today)
          date.setDate(date.getDate() - i)
          const dayData = await fetchFitbitDay(date)
          if (dayData) {
            days.push(dayData.summary)
            if (i === 0) todayActivities = dayData.activities
          }
        }
        if (days.length > 0) {
          weeklyData = days
          setDataSource('fitbit')
        }
      }
    } catch {
      // Fitbit unavailable, fall back to simulator
    }

    // Fall back to simulator if Fitbit didn't provide enough data
    if (!weeklyData) {
      weeklyData = generateWeeklyData()
      setDataSource('simulated')
    }
    if (!todayActivities) {
      todayActivities = generateDayActivities(new Date())
    }

    // Calculate weekly exposure trend
    const exposureTrend = weeklyData.map(day => {
      const exposure = calculateExposure({
        baseAQI: aqiData.aqi,
        activities: day.activities,
        hasAC: true,
        homeType: 'apartment',
      })
      return {
        date: day.date.toLocaleDateString('en-US', { weekday: 'short' }),
        personalScore: exposure.personalScore,
        cityAQI: aqiData.aqi,
      }
    })
    setWeeklyTrendData(exposureTrend)

    // Calculate trend
    const trendResult = calculateWeeklyTrend(
      exposureTrend.map(d => ({
        date: new Date(),
        personalScore: d.personalScore
      }))
    )
    setTrend(trendResult)

    // Today's activity breakdown
    const activityGroups: Record<string, { minutes: number; indoor: boolean }> = {}
    todayActivities.forEach(activity => {
      const key = activity.activityType
      if (!activityGroups[key]) {
        activityGroups[key] = { minutes: 0, indoor: activity.isIndoor }
      }
      activityGroups[key].minutes += activity.duration
    })

    setActivityData(
      Object.entries(activityGroups).map(([activity, data]) => ({
        activity,
        minutes: data.minutes,
        indoor: data.indoor,
      }))
    )

    // Hourly exposure
    const todayExposure = calculateExposure({
      baseAQI: aqiData.aqi,
      activities: todayActivities,
      hasAC: true,
      homeType: 'apartment',
    })
    setHourlyData(todayExposure.hourlyExposure)

    // Weekly summary
    setWeeklySummary(
      weeklyData.map(day => ({
        day: day.date.toLocaleDateString('en-US', { weekday: 'short' }),
        steps: day.totalSteps,
        activeMinutes: day.activeMinutes,
        indoorPercent: Math.round(day.indoorPercent),
      }))
    )

    setIsLoading(false)
  }

  const loadHistoricalData = async (cityName: string) => {
    setHistoricalLoading(true)
    setHistoricalError(null)
    try {
      const result = await cachedFetch<{ error?: string; data: HistoricalDataPoint[]; yearOverYear: YearComparison[]; summary: TrendSummary }>(
        `/api/historical-aqi?city=${encodeURIComponent(cityName)}&years=7`,
        { ttl: 60 * 60 * 1000 } // 1 hour — historical data rarely changes
      )
      if (result.error) {
        setHistoricalError(result.error)
        setHistoricalData([])
        setYearOverYear([])
        setHistoricalSummary(null)
      } else {
        setHistoricalData(result.data)
        setYearOverYear(result.yearOverYear)
        setHistoricalSummary(result.summary)
      }
    } catch {
      setHistoricalError('Failed to fetch historical data')
    } finally {
      setHistoricalLoading(false)
    }
  }

  const loadForecastData = async (cityName: string) => {
    setForecastLoading(true)
    try {
      const result = await cachedFetch<{
        historical: { date: string; aqi: number }[]
        forecast: { date: string; value: number; lower_bound: number; upper_bound: number }[]
        model?: { order: string; aic: number; rmse: number }
      }>(
        `/api/forecast?city=${encodeURIComponent(cityName)}&days=180`,
        { ttl: 60 * 60 * 1000 } // 1 hour — forecast doesn't change frequently
      )
      if (result.forecast?.length) {
        setForecastData(result)
        setForecastIsARIMA(true)
        return
      }
      setForecastData(null)
      setForecastIsARIMA(false)
    } catch {
      setForecastData(null)
      setForecastIsARIMA(false)
    } finally {
      setForecastLoading(false)
    }
  }

  const isInitialMount = useRef(true)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      loadData()
      loadHistoricalData(city)
      loadForecastData(city)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isInitialMount.current) {
      loadData()
      loadHistoricalData(city)
      loadForecastData(city)
    }
  }, [city]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCitySelect = useCallback((result: CitySearchResult) => {
    setCity(result.name)
  }, [])

  return (
    <div className="min-h-screen">
      <Header
        title="Analytics"
        subtitle="Track your exposure patterns and activity trends"
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-4"
        >
          <CitySearch
            value={city}
            onSelect={handleCitySelect}
            label="City"
            className="w-64"
            loading={isLoading}
          />
          {dataSource === 'fitbit' && (
            <Badge variant="success" size="sm">
              Fitbit Connected
            </Badge>
          )}
        </motion.div>

        {/* Stats overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Avg Exposure"
            value={trend.average}
            unit="AQI"
            color="bg-primary/10 text-primary"
          />
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Weekly Steps"
            value={Math.round(weeklySummary.reduce((sum, d) => sum + d.steps, 0) / 1000)}
            unit="k steps"
            color="bg-success/20 text-success-foreground"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Active Time"
            value={Math.round(weeklySummary.reduce((sum, d) => sum + d.activeMinutes, 0) / 60)}
            unit="hrs"
            color="bg-warning/20 text-warning-foreground"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            label="Avg Indoor"
            value={Math.round(weeklySummary.reduce((sum, d) => sum + d.indoorPercent, 0) / (weeklySummary.length || 1))}
            unit="%"
            color="bg-accent text-accent-foreground"
          />
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : (
          <>
            {/* Charts row 1 */}
            <div className="grid lg:grid-cols-2 gap-6">
              <ExposureTrendChart data={weeklyTrendData} />
              <ActivityBreakdownChart data={activityData} />
            </div>

            {/* Charts row 2 */}
            <div className="grid lg:grid-cols-2 gap-6">
              <HourlyExposureChart data={hourlyData} />
              <WeeklySummaryChart
                data={weeklySummary}
                trend={trend.trend}
                changePercent={trend.changePercent}
              />
            </div>
          </>
        )}

        {/* Forecast Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4 mt-8">
            <CloudSun className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold text-foreground">AQI Forecast</h2>
            {forecastIsARIMA && (
              <Badge variant="default" size="sm">SARIMA</Badge>
            )}
          </div>

          <Card>
            <CardContent className="pt-6">
              {forecastLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Running ARIMA forecast...</span>
                </div>
              ) : forecastData && forecastData.forecast.length > 0 ? (
                <div className="space-y-4">
                  {/* Historical + Forecast bars */}
                  {(() => {
                    const recentHist = (forecastData.historical || []).slice(-6)
                    const fPts = forecastData.forecast
                    const allValues = [...recentHist.map(h => h.aqi), ...fPts.map(f => f.upper_bound || f.value)]
                    const maxVal = Math.max(...allValues, 1)
                    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                    const getMonth = (d: string) => { const p = d.split('-'); return months[parseInt(p[1],10)-1] || d }
                    const getColor = (v: number, dim: boolean) => {
                      if (dim) {
                        if (v <= 50) return 'bg-emerald-500/50'
                        if (v <= 100) return 'bg-yellow-500/50'
                        if (v <= 150) return 'bg-orange-500/50'
                        if (v <= 200) return 'bg-red-500/50'
                        return 'bg-purple-500/50'
                      }
                      if (v <= 50) return 'bg-emerald-500'
                      if (v <= 100) return 'bg-yellow-500'
                      if (v <= 150) return 'bg-orange-500'
                      if (v <= 200) return 'bg-red-500'
                      return 'bg-purple-500'
                    }
                    return (
                      <>
                        <div className="flex items-end gap-2">
                          {recentHist.map((h, i) => {
                            const barH = Math.max(8, (h.aqi / maxVal) * 120)
                            return (
                              <div key={`h-${i}`} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-xs text-muted-foreground">{h.aqi}</span>
                                <motion.div
                                  className={`w-full rounded-t-sm ${getColor(h.aqi, true)} min-w-[20px]`}
                                  initial={{ height: 0 }}
                                  animate={{ height: barH }}
                                  transition={{ duration: 0.5, delay: i * 0.06 }}
                                />
                                <span className="text-[10px] text-muted-foreground/60">{getMonth(h.date)}</span>
                              </div>
                            )
                          })}
                          {recentHist.length > 0 && <div className="w-px bg-border mx-1" style={{ height: 120 }} />}
                          {fPts.map((f, i) => {
                            const barH = Math.max(8, (f.value / maxVal) * 120)
                            return (
                              <div key={`f-${i}`} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-xs font-medium text-foreground">{Math.round(f.value)}</span>
                                <motion.div
                                  className={`w-full rounded-t-sm ${getColor(f.value, false)} min-w-[20px]`}
                                  initial={{ height: 0 }}
                                  animate={{ height: barH }}
                                  transition={{ duration: 0.5, delay: (recentHist.length + i) * 0.06 }}
                                />
                                <span className="text-[10px] font-medium text-foreground">{getMonth(f.date)}</span>
                                <span className="text-[9px] text-muted-foreground">
                                  {Math.round(f.lower_bound)}-{Math.round(f.upper_bound)}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t border-border">
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-2 rounded-sm bg-muted-foreground/30 inline-block" /> Historical
                            <span className="w-3 h-2 rounded-sm bg-primary inline-block" /> Forecast
                          </span>
                          {forecastData.model && (
                            <span>SARIMA {forecastData.model.order}</span>
                          )}
                        </div>
                      </>
                    )
                  })()}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Unable to generate forecast. Ensure the ARIMA analytics service is running.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Sustainability Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-4 mt-8">
            <Leaf className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl font-bold text-foreground">Sustainability Analytics</h2>
            <Badge variant="default" size="sm">Historical Data</Badge>
          </div>

          {historicalLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Fetching historical AQI data for {city}...
                </p>
                <p className="text-xs text-muted-foreground">
                  This may take a moment for the first load
                </p>
              </div>
            </div>
          ) : historicalError ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">{historicalError}</p>
                <button
                  onClick={() => loadHistoricalData(city)}
                  className="mt-3 text-sm text-primary hover:underline"
                >
                  Retry
                </button>
              </CardContent>
            </Card>
          ) : historicalData.length > 0 && historicalSummary ? (
            <SustainabilityChart
              data={historicalData}
              yearOverYear={yearOverYear}
              summary={historicalSummary}
              city={city}
            />
          ) : null}
        </motion.div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  unit: string
  color: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}>
              {icon}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold text-foreground">
                {value}
                <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
