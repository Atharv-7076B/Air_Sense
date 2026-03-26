'use client'

import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { Watch, Battery, Wifi, Heart, Footprints, Flame, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeviceCardProps {
  deviceName: string
  deviceId: string
  batteryLevel: number
  lastSync: Date
  isConnected: boolean
  type: 'apple_watch' | 'noise_band' | 'fitbit'
  metrics: {
    heartRate: number
    steps: number
    calories: number
    activeMinutes: number
  }
  onSync?: () => void
}

export function DeviceCard({
  deviceName,
  deviceId,
  batteryLevel,
  lastSync,
  isConnected,
  type,
  metrics,
  onSync,
}: DeviceCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              type === 'apple_watch'
                ? 'bg-gradient-to-br from-gray-800 to-gray-900'
                : type === 'fitbit'
                ? 'bg-gradient-to-br from-[#00B0B9]/20 to-[#00B0B9]/30'
                : 'bg-gradient-to-br from-primary/20 to-primary/30'
            )}>
              <Watch className={cn(
                'w-6 h-6',
                type === 'apple_watch' ? 'text-white' : type === 'fitbit' ? 'text-[#00B0B9]' : 'text-primary'
              )} />
            </div>
            <div>
              <CardTitle className="text-base">{deviceName}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{deviceId}</p>
            </div>
          </div>
          <Badge 
            variant={isConnected ? 'success' : 'default'}
            size="sm"
          >
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Battery and sync info */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Battery className={cn(
              'w-4 h-4',
              batteryLevel < 20 ? 'text-danger-foreground' : 'text-success-foreground'
            )} />
            <span className="text-sm text-muted-foreground">{batteryLevel}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Synced {formatTimeAgo(lastSync)}
            </span>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-4">
          <MetricItem
            icon={<Heart className="w-4 h-4" />}
            label="Heart Rate"
            value={metrics.heartRate}
            unit="bpm"
            color="text-danger-foreground"
          />
          <MetricItem
            icon={<Footprints className="w-4 h-4" />}
            label="Steps"
            value={metrics.steps.toLocaleString()}
            color="text-primary"
          />
          <MetricItem
            icon={<Flame className="w-4 h-4" />}
            label="Calories"
            value={metrics.calories}
            unit="kcal"
            color="text-warning-foreground"
          />
          <MetricItem
            icon={<Activity className="w-4 h-4" />}
            label="Active"
            value={metrics.activeMinutes}
            unit="min"
            color="text-success-foreground"
          />
        </div>

        {/* Sync button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSync}
          className="w-full mt-4 py-2.5 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-accent transition-colors"
        >
          {type === 'fitbit' ? 'Sync from Fitbit' : 'Simulate New Data'}
        </motion.button>
      </CardContent>
    </Card>
  )
}

function MetricItem({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  unit?: string
  color?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn('p-2 rounded-lg bg-muted', color)}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">
          {value}
          {unit && <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>}
        </p>
      </div>
    </div>
  )
}

function formatTimeAgo(date: Date | string): string {
  const now = new Date()
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}
