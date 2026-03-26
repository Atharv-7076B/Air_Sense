'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, Badge } from '@/components/ui'
import { motion } from 'framer-motion'
import { Shield, Dumbbell, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import type { ResilienceResult, ScoreBreakdown } from '@/lib/resilience-score'
import type { FitnessResult, FitnessBreakdown } from '@/lib/fitness-score'
import { cachedFetch } from '@/lib/client-cache'

function CircularProgress({
  score,
  size = 80,
  strokeWidth = 6,
  color,
}: {
  score: number
  size?: number
  strokeWidth?: number
  color: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeDasharray={circumference}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-foreground">{score}</span>
      </div>
    </div>
  )
}

function BreakdownItem({ item }: { item: ScoreBreakdown | FitnessBreakdown }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">{item.factor}</span>
          <span className="text-xs text-muted-foreground">{item.score}/100</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              backgroundColor: item.score >= 70 ? '#22c55e' : item.score >= 40 ? '#f59e0b' : '#ef4444',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${item.score}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>
      </div>
    </div>
  )
}

function ScoreCard({
  title,
  icon,
  score,
  level,
  interpretation,
  breakdown,
  color,
  isLoading,
}: {
  title: string
  icon: React.ReactNode
  score: number
  level: string
  interpretation: string
  breakdown: (ScoreBreakdown | FitnessBreakdown)[]
  color: string
  isLoading: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const levelColors: Record<string, string> = {
    excellent: 'success',
    good: 'success',
    average: 'warning',
    below_average: 'warning',
    poor: 'danger',
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-4">
          <CircularProgress score={score} color={color} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {icon}
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            </div>
            <Badge
              variant={levelColors[level] as 'success' | 'warning' | 'danger' | 'default'}
              size="sm"
              className="mt-1"
            >
              {level.replace('_', ' ')}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {interpretation}
            </p>
          </div>
        </div>

        {/* Expandable breakdown */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Hide' : 'Show'} breakdown
        </button>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 space-y-1 border-t border-border pt-2"
          >
            {breakdown.map((item, i) => (
              <BreakdownItem key={i} item={item} />
            ))}
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}

export function ScoreCards() {
  const [resilience, setResilience] = useState<ResilienceResult | null>(null)
  const [fitness, setFitness] = useState<FitnessResult | null>(null)
  const [loadingResilience, setLoadingResilience] = useState(true)
  const [loadingFitness, setLoadingFitness] = useState(true)

  useEffect(() => {
    const loadScores = async () => {
      try {
        const ttl = 30 * 60 * 1000
        const [resData, fitData] = await Promise.all([
          cachedFetch<ResilienceResult & { error?: string }>('/api/resilience', { ttl }),
          cachedFetch<FitnessResult & { error?: string }>('/api/fitness', { ttl }),
        ])

        if (!resData.error) setResilience(resData)
        if (!fitData.error) setFitness(fitData)
      } catch {
        // Scores unavailable
      } finally {
        setLoadingResilience(false)
        setLoadingFitness(false)
      }
    }
    loadScores()
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ScoreCard
        title="Resilience Score"
        icon={<Shield className="w-4 h-4 text-blue-500" />}
        score={resilience?.score ?? 0}
        level={resilience?.level ?? 'average'}
        interpretation={resilience?.interpretation ?? ''}
        breakdown={resilience?.breakdown ?? []}
        color="#3b82f6"
        isLoading={loadingResilience}
      />
      <ScoreCard
        title="Fitness Score"
        icon={<Dumbbell className="w-4 h-4 text-emerald-500" />}
        score={fitness?.score ?? 0}
        level={fitness?.level ?? 'average'}
        interpretation={fitness?.interpretation ?? ''}
        breakdown={fitness?.breakdown ?? []}
        color="#22c55e"
        isLoading={loadingFitness}
      />
    </div>
  )
}
