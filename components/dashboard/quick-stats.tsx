'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, Progress } from '@/components/ui'
import { Home, Activity, Footprints, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickStatsProps {
  indoorPercent: number
  avgActivityLevel: number
  totalSteps: number
  avgHeartRate: number
  className?: string
}

export function QuickStats({
  indoorPercent,
  avgActivityLevel,
  totalSteps,
  avgHeartRate,
  className,
}: QuickStatsProps) {
  const stats = [
    {
      label: 'Indoor Time',
      value: `${indoorPercent}%`,
      progress: indoorPercent,
      icon: <Home className="w-4 h-4" />,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      description: indoorPercent >= 80 ? 'Great protection!' : 'Try to stay indoors more',
    },
    {
      label: 'Activity Level',
      value: `${avgActivityLevel}x`,
      progress: Math.min(avgActivityLevel * 33, 100),
      icon: <Activity className="w-4 h-4" />,
      color: 'text-success-foreground',
      bgColor: 'bg-success/20',
      description: avgActivityLevel > 1.5 ? 'High breathing rate' : 'Normal activity',
    },
    {
      label: 'Steps Today',
      value: totalSteps.toLocaleString(),
      progress: Math.min((totalSteps / 10000) * 100, 100),
      icon: <Footprints className="w-4 h-4" />,
      color: 'text-warning-foreground',
      bgColor: 'bg-warning/20',
      description: totalSteps >= 10000 ? 'Goal reached!' : `${Math.round((totalSteps / 10000) * 100)}% of daily goal`,
    },
    {
      label: 'Avg Heart Rate',
      value: `${avgHeartRate} bpm`,
      progress: Math.min(((avgHeartRate - 50) / 100) * 100, 100),
      icon: <Heart className="w-4 h-4" />,
      color: 'text-danger-foreground',
      bgColor: 'bg-danger/20',
      description: avgHeartRate < 80 ? 'Resting range' : 'Active range',
    },
  ]

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="h-full">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('p-2 rounded-lg', stat.bgColor, stat.color)}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                </div>
              </div>
              <Progress 
                value={stat.progress} 
                size="sm" 
                className="mb-2" 
              />
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
