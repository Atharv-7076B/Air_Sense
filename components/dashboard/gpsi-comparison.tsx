'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, Badge } from '@/components/ui'
import { motion } from 'framer-motion'
import { Globe, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'
import { cachedFetch } from '@/lib/client-cache'

interface GPSIData {
  score: number
  breakdown: {
    environmental: { score: number; details: string }
    health: { score: number; details: string }
    infrastructure: { score: number; details: string }
  }
  comparison?: {
    userResilience: number
    cityAvgResilience: number
    percentile: string
    insight: string
  }
}

export function GPSIComparison({ city }: { city: string }) {
  const [data, setData] = useState<GPSIData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchGPSI = async () => {
      setIsLoading(true)
      try {
        const result = await cachedFetch<GPSIData & { error?: string }>(
          `/api/gpsi?city=${encodeURIComponent(city)}`,
          { ttl: 60 * 60 * 1000 } // 1 hour — city data rarely changes
        )
        if (!result.error) {
          setData(result)
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false)
      }
    }
    fetchGPSI()
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

  if (!data) return null

  const gpsi = data
  const comparison = data.comparison

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">City Sustainability Index</h3>
            <Badge size="sm">{city}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* GPSI Score */}
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40" cy="40" r="34"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-muted/30"
                />
                <circle
                  cx="40" cy="40" r="34"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeDasharray={`${(gpsi.score / 100) * 213.6} 213.6`}
                  strokeLinecap="round"
                  className={
                    gpsi.score >= 70 ? 'text-emerald-500' :
                    gpsi.score >= 40 ? 'text-yellow-500' : 'text-red-500'
                  }
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">{gpsi.score}</span>
              </div>
            </div>

            <div className="flex-1">
              <p className="text-sm text-foreground font-medium">GPSI Score</p>
              <p className="text-xs text-muted-foreground mt-1">
                {gpsi.score >= 70 ? 'Good sustainability conditions' :
                 gpsi.score >= 50 ? 'Moderate sustainability challenges' :
                 'Significant sustainability concerns'}
              </p>
            </div>
          </div>

          {/* Breakdown bars */}
          <div className="space-y-2">
            {[
              { label: 'Environmental', score: gpsi.breakdown.environmental.score, color: 'bg-emerald-500' },
              { label: 'Health', score: gpsi.breakdown.health.score, color: 'bg-blue-500' },
              { label: 'Infrastructure', score: gpsi.breakdown.infrastructure.score, color: 'bg-purple-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-foreground font-medium">{item.score}/100</span>
                </div>
                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${item.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.score}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* User vs City comparison */}
          {comparison && (
            <div className="pt-3 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                {comparison.userResilience > comparison.cityAvgResilience ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : comparison.userResilience < comparison.cityAvgResilience ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : (
                  <Minus className="w-4 h-4 text-yellow-500" />
                )}
                <p className="text-xs text-foreground">{comparison.insight}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-lg font-bold text-foreground">{comparison.userResilience}</p>
                  <p className="text-xs text-muted-foreground">Your Resilience</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-lg font-bold text-foreground">{comparison.cityAvgResilience}</p>
                  <p className="text-xs text-muted-foreground">City Average</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Estimated {comparison.percentile} of residents
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
