'use client'

// Motion import available for animations
import { Card, CardContent, Badge, CircularProgress } from '@/components/ui'
import { TrendingDown, TrendingUp, Minus, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExposureResult } from '@/lib/exposure-calculator'

interface ExposureScoreProps {
  exposure: ExposureResult
  cityAQI: number
  className?: string
}

export function ExposureScore({ exposure, cityAQI, className }: ExposureScoreProps) {
  const { personalScore, riskCategory, breakdown } = exposure
  
  const reduction = Math.round(((cityAQI - personalScore) / cityAQI) * 100)
  const isReduced = reduction > 0
  
  const riskColors = {
    low: { variant: 'success' as const, color: '#A7F3D0' },
    moderate: { variant: 'warning' as const, color: '#FDE68A' },
    high: { variant: 'danger' as const, color: '#FECACA' },
    very_high: { variant: 'danger' as const, color: '#FECACA' },
  }

  const riskLabels = {
    low: 'Low Risk',
    moderate: 'Moderate',
    high: 'High Risk',
    very_high: 'Very High',
  }

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Background gradient */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${riskColors[riskCategory].color}, transparent 60%)`,
        }}
      />
      
      <CardContent className="relative pt-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Your Exposure Score
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Based on today&apos;s activity
            </p>
          </div>
          <Badge variant={riskColors[riskCategory].variant}>
            {riskLabels[riskCategory]}
          </Badge>
        </div>

        <div className="flex items-center gap-8">
          {/* Circular progress */}
          <CircularProgress
            value={personalScore}
            max={300}
            size={140}
            strokeWidth={12}
            variant={riskColors[riskCategory].variant}
            label="AQI"
          />

          {/* Stats */}
          <div className="flex-1 space-y-4">
            {/* Comparison with city */}
            <div className="flex items-center gap-2">
              {isReduced ? (
                <TrendingDown className="w-5 h-5 text-success-foreground" />
              ) : reduction < 0 ? (
                <TrendingUp className="w-5 h-5 text-danger-foreground" />
              ) : (
                <Minus className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="text-sm text-foreground">
                {isReduced ? (
                  <><span className="font-semibold text-success-foreground">{reduction}% lower</span> than city AQI</>
                ) : reduction < 0 ? (
                  <><span className="font-semibold text-danger-foreground">{Math.abs(reduction)}% higher</span> than city AQI</>
                ) : (
                  <>Same as city AQI</>
                )}
              </span>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <BreakdownItem 
                label="City AQI" 
                value={cityAQI.toString()} 
              />
              <BreakdownItem 
                label="Indoor Factor" 
                value={`${Math.round((1 - breakdown.indoorFactor) * 100)}% filtered`} 
              />
              <BreakdownItem 
                label="Activity Level" 
                value={`${breakdown.activityMultiplier}x`} 
              />
              <BreakdownItem 
                label="Location" 
                value={`${breakdown.locationModifier}x`} 
              />
            </div>
          </div>
        </div>

        {/* Tooltip */}
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Your personal exposure is calculated based on time spent indoors, activity level, 
            and local environmental factors. Lower is better.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function BreakdownItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-muted/50">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
