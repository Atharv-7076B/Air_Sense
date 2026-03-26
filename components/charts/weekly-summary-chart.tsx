'use client'

import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface WeeklySummaryChartProps {
  data: {
    day: string
    steps: number
    activeMinutes: number
    indoorPercent: number
  }[]
  trend: 'improving' | 'stable' | 'worsening'
  changePercent: number
  className?: string
}

export function WeeklySummaryChart({ 
  data, 
  trend, 
  changePercent, 
  className 
}: WeeklySummaryChartProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'improving':
        return <TrendingDown className="w-4 h-4 text-success-foreground" />
      case 'worsening':
        return <TrendingUp className="w-4 h-4 text-danger-foreground" />
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getTrendLabel = () => {
    switch (trend) {
      case 'improving':
        return `${Math.abs(changePercent)}% improvement`
      case 'worsening':
        return `${changePercent}% increase`
      default:
        return 'Stable'
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Weekly Activity Summary</CardTitle>
          <Badge 
            variant={trend === 'improving' ? 'success' : trend === 'worsening' ? 'danger' : 'default'}
            className="flex items-center gap-1"
          >
            {getTrendIcon()}
            {getTrendLabel()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#94A3B8" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A7F3D0" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#A7F3D0" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis 
                dataKey="day" 
                stroke="#64748B"
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                yAxisId="left"
                stroke="#64748B"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#64748B"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="steps"
                stroke="#94A3B8"
                fillOpacity={1}
                fill="url(#colorSteps)"
                name="Steps"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="activeMinutes"
                stroke="#A7F3D0"
                fillOpacity={1}
                fill="url(#colorActive)"
                name="Active Minutes"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Steps</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-sm text-muted-foreground">Active Minutes</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
