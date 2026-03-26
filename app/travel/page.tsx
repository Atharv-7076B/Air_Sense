'use client'

import { useState } from 'react'
import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, Badge } from '@/components/ui'
import { CitySearch } from '@/components/ui/city-search'
import type { CitySearchResult } from '@/lib/city-search'
import type { TravelAdvisory } from '@/lib/travel-advisory'
import type { AQIData } from '@/lib/aqi-client'
import type { ProductRecommendation } from '@/lib/product-recommendations'
import { motion } from 'framer-motion'
import {
  Plane,
  ArrowRight,
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ShoppingBag,
  Loader2,
  MapPin,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'

export default function TravelPage() {
  const [originCity, setOriginCity] = useState<CitySearchResult | null>(null)
  const [destCity, setDestCity] = useState<CitySearchResult | null>(null)
  const [travelDate, setTravelDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [isLoading, setIsLoading] = useState(false)
  const [advisory, setAdvisory] = useState<TravelAdvisory | null>(null)
  const [originAQI, setOriginAQI] = useState<AQIData | null>(null)
  const [destAQI, setDestAQI] = useState<AQIData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGetAdvisory = async () => {
    if (!originCity || !destCity) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originCity: originCity.name,
          destinationCity: destCity.name,
          travelDate,
        }),
      })

      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setAdvisory(data.advisory)
        setOriginAQI(data.originAQIData)
        setDestAQI(data.destinationAQIData)
      }
    } catch {
      setError('Failed to generate travel advisory')
    } finally {
      setIsLoading(false)
    }
  }

  const levelConfig = {
    safe: {
      icon: CheckCircle,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      badge: 'success' as const,
    },
    caution: {
      icon: AlertCircle,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      badge: 'warning' as const,
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      badge: 'warning' as const,
    },
    danger: {
      icon: Shield,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      badge: 'danger' as const,
    },
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Travel Advisory"
        subtitle="Compare air quality between cities before you travel"
      />

      <div className="p-6 space-y-6">
        {/* Input form */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Origin City
                  </label>
                  <CitySearch
                    value={originCity?.name || ''}
                    onSelect={setOriginCity}
                    placeholder="Where are you now?"
                  />
                </div>

                <div className="flex items-center justify-center pb-2">
                  <div className="p-2 rounded-full bg-muted">
                    <Plane className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Destination City
                  </label>
                  <CitySearch
                    value={destCity?.name || ''}
                    onSelect={setDestCity}
                    placeholder="Where are you going?"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Travel Date
                  </label>
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  />
                </div>

                <button
                  onClick={handleGetAdvisory}
                  disabled={!originCity || !destCity || isLoading}
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  Get Advisory
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {error && (
          <Card>
            <CardContent className="py-6 text-center">
              <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Advisory result */}
        {advisory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* AQI Comparison */}
            <div className="grid md:grid-cols-3 gap-4">
              <AQIComparisonCard
                label="Origin"
                city={originCity?.name || ''}
                aqi={advisory.aqiComparison.origin}
              />

              <Card>
                <CardContent className="pt-6 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {advisory.aqiComparison.direction === 'better' ? (
                      <ArrowDownRight className="w-6 h-6 text-emerald-500" />
                    ) : advisory.aqiComparison.direction === 'worse' ? (
                      <ArrowUpRight className="w-6 h-6 text-red-500" />
                    ) : (
                      <Minus className="w-6 h-6 text-yellow-500" />
                    )}
                    <span className="text-2xl font-bold text-foreground">
                      {advisory.aqiComparison.change > 0 ? '+' : ''}
                      {advisory.aqiComparison.change}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    AQI Change
                  </p>
                  <Badge
                    variant={
                      advisory.aqiComparison.direction === 'better' ? 'success' :
                      advisory.aqiComparison.direction === 'worse' ? 'danger' : 'warning'
                    }
                    className="mt-2"
                  >
                    Air quality {advisory.aqiComparison.direction}
                  </Badge>
                </CardContent>
              </Card>

              <AQIComparisonCard
                label="Destination"
                city={destCity?.name || ''}
                aqi={advisory.aqiComparison.destination}
              />
            </div>

            {/* Advisory level */}
            {(() => {
              const config = levelConfig[advisory.level]
              const Icon = config.icon
              return (
                <Card className={`border ${config.border}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${config.bg}`}>
                        <Icon className={`w-6 h-6 ${config.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            Travel Advisory
                          </h3>
                          <Badge variant={config.badge}>
                            {advisory.level.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground mb-3">
                          {advisory.summary}
                        </p>
                        <div className="space-y-1.5">
                          {advisory.details.map((detail, i) => (
                            <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0" />
                              {detail}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })()}

            {/* Preparations */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-foreground">
                  Preparation Checklist
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {advisory.preparations.map((prep, i) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                        {prep}
                      </span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Travel Kit */}
            {advisory.travelKit.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">
                      Recommended Travel Kit
                    </h3>
                    <Badge size="sm">Partner Recommendations</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {advisory.travelKit.map((rec: ProductRecommendation) => (
                      <div
                        key={rec.product.id}
                        className="p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
                      >
                        <p className="font-medium text-sm text-foreground">
                          {rec.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {rec.product.description}
                        </p>
                        <p className="text-xs text-primary mt-1">{rec.reason}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-sm font-semibold text-foreground">
                            {rec.product.priceRange}
                          </span>
                          <Badge size="sm" variant="default">
                            {rec.product.category.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

function AQIComparisonCard({
  label,
  city,
  aqi,
}: {
  label: string
  city: string
  aqi: number
}) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground mt-1">{city}</p>
        <p className="text-4xl font-bold text-foreground mt-2">{aqi}</p>
        <p className="text-xs text-muted-foreground">AQI</p>
        <Badge
          variant={aqi <= 50 ? 'success' : aqi <= 100 ? 'warning' : 'danger'}
          className="mt-2"
        >
          {aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy (SG)' : aqi <= 200 ? 'Unhealthy' : 'Hazardous'}
        </Badge>
      </CardContent>
    </Card>
  )
}
