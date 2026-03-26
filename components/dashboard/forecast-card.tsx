'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, Badge } from '@/components/ui'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Loader2, CloudSun, BrainCircuit } from 'lucide-react'
import { cachedFetch } from '@/lib/client-cache'

interface ForecastPoint {
  date: string
  value: number
  lower_bound: number
  upper_bound: number
}

interface ForecastResponse {
  city: string
  historical: { date: string; aqi: number }[]
  forecast: ForecastPoint[]
  model?: { order: string; aic: number; rmse: number }
}

export function ForecastCard({ city }: { city: string }) {
  const [data, setData] = useState<ForecastResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isARIMA, setIsARIMA] = useState(false)

  useEffect(() => {
    const fetchForecast = async () => {
      setIsLoading(true)
      try {
        // Request 6 months of forecast from real ARIMA service
        const result = await cachedFetch<ForecastResponse>(
          `/api/forecast?city=${encodeURIComponent(city)}&days=180`,
          { ttl: 60 * 60 * 1000 } // 1 hour
        )
        if (result.forecast?.length > 0) {
          setData(result)
          setIsARIMA(true)
          return
        }
      } catch {
        // Fall through to simulated
      }

      // Fallback: generate simulated monthly forecast
      setData(generateSimulatedMonthly(city))
      setIsARIMA(false)
      setIsLoading(false)
    }

    fetchForecast().finally(() => setIsLoading(false))
  }, [city])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.forecast.length === 0) return null

  const forecastPoints = data.forecast
  const firstVal = forecastPoints[0].value
  const lastVal = forecastPoints[forecastPoints.length - 1].value
  const trend = lastVal < firstVal - 10 ? 'improving' : lastVal > firstVal + 10 ? 'worsening' : 'stable'
  const maxVal = Math.max(...forecastPoints.map(f => f.upper_bound || f.value))

  // Get last 3 historical months for context
  const recentHistorical = (data.historical || []).slice(-3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">AQI Forecast</h3>
            {isARIMA && (
              <Badge size="sm" variant="default">
                <BrainCircuit className="w-3 h-3 mr-1" />
                ARIMA
              </Badge>
            )}
            <Badge
              size="sm"
              variant={trend === 'improving' ? 'success' : trend === 'worsening' ? 'danger' : 'warning'}
            >
              {trend === 'improving' && <TrendingDown className="w-3 h-3 mr-1" />}
              {trend === 'worsening' && <TrendingUp className="w-3 h-3 mr-1" />}
              {trend === 'stable' && <Minus className="w-3 h-3 mr-1" />}
              {trend}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Bar chart: historical (dimmed) + forecast (bright) */}
          <div className="flex items-end gap-1.5 h-28">
            {/* Recent historical bars */}
            {recentHistorical.map((h, i) => {
              const aqi = h.aqi || 0
              const height = Math.max(10, (aqi / maxVal) * 100)
              const color = getAQIColor(aqi, true)
              const label = formatMonth(h.date)
              return (
                <div key={`h-${i}`} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    className={`w-full rounded-t-sm ${color}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                  />
                  <span className="text-[10px] text-muted-foreground/60">{label}</span>
                  <span className="text-[10px] text-muted-foreground">{aqi}</span>
                </div>
              )
            })}

            {/* Divider */}
            {recentHistorical.length > 0 && (
              <div className="w-px h-full bg-border/50 mx-0.5" />
            )}

            {/* Forecast bars */}
            {forecastPoints.map((f, i) => {
              const height = Math.max(10, (f.value / maxVal) * 100)
              const color = getAQIColor(f.value, false)
              const label = formatMonth(f.date)
              return (
                <div key={`f-${i}`} className="flex-1 flex flex-col items-center gap-1 relative group">
                  {/* Confidence interval (background) */}
                  {f.upper_bound > 0 && (
                    <motion.div
                      className="absolute bottom-6 w-full rounded-t-sm bg-primary/10"
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(5, (f.upper_bound / maxVal) * 100)}%` }}
                      transition={{ duration: 0.5, delay: (recentHistorical.length + i) * 0.05 }}
                    />
                  )}
                  <motion.div
                    className={`w-full rounded-t-sm ${color} relative z-10`}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.5, delay: (recentHistorical.length + i) * 0.05 }}
                  />
                  <span className="text-[10px] text-foreground font-medium">{label}</span>
                  <span className="text-[10px] font-bold text-foreground">{Math.round(f.value)}</span>
                </div>
              )
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
            <span>
              {isARIMA
                ? `SARIMA model${data.model?.order ? ` ${data.model.order}` : ''}`
                : 'Rule-based forecast'}
            </span>
            <span>
              Avg: AQI {Math.round(forecastPoints.reduce((s, f) => s + f.value, 0) / forecastPoints.length)}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function getAQIColor(aqi: number, dimmed: boolean): string {
  const opacity = dimmed ? '/50' : ''
  if (aqi <= 50) return `bg-emerald-500${opacity}`
  if (aqi <= 100) return `bg-yellow-500${opacity}`
  if (aqi <= 150) return `bg-orange-500${opacity}`
  if (aqi <= 200) return `bg-red-500${opacity}`
  return `bg-purple-500${opacity}`
}

function formatMonth(date: string): string {
  // date is like "2026-04" or "2024-12"
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const parts = date.split('-')
  if (parts.length >= 2) {
    const monthIdx = parseInt(parts[1], 10) - 1
    return months[monthIdx] || date
  }
  return date
}

function generateSimulatedMonthly(city: string): ForecastResponse {
  const now = new Date()
  const forecast: ForecastPoint[] = []
  // Simple seed from city name
  let seed = 0
  for (let i = 0; i < city.length; i++) seed += city.charCodeAt(i)
  const baseAQI = 60 + (seed % 80)

  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const month = d.getMonth()
    // Seasonal pattern: winter worse, monsoon better
    const seasonal = month >= 10 || month <= 1 ? 40 : month >= 6 && month <= 8 ? -30 : 0
    const value = Math.max(10, baseAQI + seasonal + (Math.sin(i) * 15))
    forecast.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      value: Math.round(value),
      lower_bound: Math.max(0, Math.round(value - 30)),
      upper_bound: Math.round(value + 30),
    })
  }

  return { city, historical: [], forecast }
}
