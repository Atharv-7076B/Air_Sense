'use client'

import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Lightbulb, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
interface InsightsCardProps {
  insights: string[]
  riskCategory: 'low' | 'moderate' | 'high' | 'very_high'
  className?: string
}

export function InsightsCard({ insights, riskCategory, className }: InsightsCardProps) {
  const getIcon = () => {
    if (riskCategory === 'low') {
      return <CheckCircle2 className="w-4 h-4 text-success-foreground" />
    }
    if (riskCategory === 'high' || riskCategory === 'very_high') {
      return <AlertTriangle className="w-4 h-4 text-danger-foreground" />
    }
    return <Info className="w-4 h-4 text-primary" />
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-warning-foreground" />
          <CardTitle>Today&apos;s Insights</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3"
            >
              <div className="mt-0.5 shrink-0">
                {getIcon()}
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {insight}
              </p>
            </motion.div>
          ))}
        </div>

        {insights.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No insights available yet. Check back after some activity data is collected.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
