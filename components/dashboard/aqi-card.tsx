'use client'

import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { MapPin, Wind, Droplets, Thermometer, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAQICategory, type AQIData } from '@/lib/aqi-client'

interface AQICardProps {
  data: AQIData
  onRefresh?: () => void
  isLoading?: boolean
  className?: string
}

export function AQICard({ data, onRefresh, isLoading, className }: AQICardProps) {
  const category = getAQICategory(data.aqi)

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">{data.city}</CardTitle>
          </div>
          {onRefresh && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <RefreshCw className={cn('w-4 h-4 text-muted-foreground', isLoading && 'animate-spin')} />
            </motion.button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Main AQI display */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">{data.aqi}</span>
              <span className="text-sm text-muted-foreground">AQI</span>
            </div>
            <Badge variant={
              data.aqi <= 50 ? 'success' : 
              data.aqi <= 100 ? 'warning' : 'danger'
            } className="mt-1">
              {category.level}
            </Badge>
          </div>
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center',
            category.bgColor
          )}>
            <Wind className={cn('w-8 h-8', category.color)} />
          </div>
        </div>

        {/* Pollutant levels */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <PollutantItem label="PM2.5" value={data.pm25} unit="µg/m³" />
          <PollutantItem label="PM10" value={data.pm10} unit="µg/m³" />
          <PollutantItem label="O3" value={data.o3} unit="ppb" />
        </div>

        {/* Weather conditions */}
        {(data.temperature || data.humidity) && (
          <div className="flex items-center gap-4 pt-3 border-t border-border">
            {data.temperature && (
              <div className="flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{data.temperature}°C</span>
              </div>
            )}
            {data.humidity && (
              <div className="flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{data.humidity}%</span>
              </div>
            )}
            {data.wind && (
              <div className="flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{data.wind} m/s</span>
              </div>
            )}
          </div>
        )}

        {/* Health implications */}
        <p className="text-xs text-muted-foreground mt-3">
          {category.healthImplications}
        </p>
      </CardContent>
    </Card>
  )
}

function PollutantItem({ 
  label, 
  value, 
  unit 
}: { 
  label: string
  value: number | null
  unit: string 
}) {
  if (value === null) return null
  
  return (
    <div className="px-2 py-1.5 rounded-lg bg-muted/50 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">
        {value}
        <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>
      </p>
    </div>
  )
}
