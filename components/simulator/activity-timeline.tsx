'use client'

import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { 
  Moon, 
  Sofa, 
  PersonStanding, 
  Bike, 
  Briefcase, 
  Car,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActivityData, ActivityType } from '@/lib/wearable-simulator'

interface ActivityTimelineProps {
  activities: ActivityData[]
  className?: string
}

const activityIcons: Record<ActivityType, React.ReactNode> = {
  sleeping: <Moon className="w-4 h-4" />,
  resting: <Sofa className="w-4 h-4" />,
  walking: <PersonStanding className="w-4 h-4" />,
  running: <Activity className="w-4 h-4" />,
  cycling: <Bike className="w-4 h-4" />,
  working: <Briefcase className="w-4 h-4" />,
  commuting: <Car className="w-4 h-4" />,
}

const activityColors: Record<ActivityType, string> = {
  sleeping: 'bg-primary/20 text-primary',
  resting: 'bg-muted text-muted-foreground',
  walking: 'bg-success/50 text-success-foreground',
  running: 'bg-danger/50 text-danger-foreground',
  cycling: 'bg-warning/50 text-warning-foreground',
  working: 'bg-accent text-accent-foreground',
  commuting: 'bg-primary/30 text-primary',
}

export function ActivityTimeline({ activities, className }: ActivityTimelineProps) {
  // Group consecutive activities of the same type
  const groupedActivities = groupConsecutiveActivities(activities)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Today&apos;s Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

          {/* Activity items */}
          <div className="space-y-4">
            {groupedActivities.map((group, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative flex items-start gap-4"
              >
                {/* Icon */}
                <div className={cn(
                  'relative z-10 w-10 h-10 rounded-full flex items-center justify-center',
                  activityColors[group.activityType]
                )}>
                  {activityIcons[group.activityType]}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground capitalize">
                      {group.activityType}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeRange(group.startTime, group.endTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant={group.isIndoor ? 'default' : 'primary'} size="sm">
                      {group.isIndoor ? 'Indoor' : 'Outdoor'}
                    </Badge>
                    {group.avgHeartRate > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {group.avgHeartRate} bpm avg
                      </span>
                    )}
                    {group.totalSteps > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {group.totalSteps.toLocaleString()} steps
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface GroupedActivity {
  activityType: ActivityType
  startTime: Date
  endTime: Date
  isIndoor: boolean
  avgHeartRate: number
  totalSteps: number
  totalCalories: number
}

function groupConsecutiveActivities(activities: ActivityData[]): GroupedActivity[] {
  if (activities.length === 0) return []

  const groups: GroupedActivity[] = []
  let currentGroup: GroupedActivity | null = null

  for (const activity of activities) {
    if (
      currentGroup &&
      currentGroup.activityType === activity.activityType &&
      currentGroup.isIndoor === activity.isIndoor
    ) {
      // Extend current group
      currentGroup.endTime = new Date(new Date(activity.timestamp).getTime() + activity.duration * 60000)
      currentGroup.avgHeartRate = Math.round(
        (currentGroup.avgHeartRate + activity.heartRate) / 2
      )
      currentGroup.totalSteps += activity.steps
      currentGroup.totalCalories += activity.calories
    } else {
      // Start new group
      if (currentGroup) {
        groups.push(currentGroup)
      }
      currentGroup = {
        activityType: activity.activityType,
        startTime: activity.timestamp,
        endTime: new Date(new Date(activity.timestamp).getTime() + activity.duration * 60000),
        isIndoor: activity.isIndoor,
        avgHeartRate: activity.heartRate,
        totalSteps: activity.steps,
        totalCalories: activity.calories,
      }
    }
  }

  if (currentGroup) {
    groups.push(currentGroup)
  }

  return groups
}

function formatTimeRange(start: Date, end: Date): string {
  const formatTime = (d: Date) => {
    return new Date(d).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }
  return `${formatTime(start)} - ${formatTime(end)}`
}
