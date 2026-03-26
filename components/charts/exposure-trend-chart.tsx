'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
// Utils available for styling

interface ExposureTrendChartProps {
  data: {
    date: string
    personalScore: number
    cityAQI: number
  }[]
  className?: string
}

export function ExposureTrendChart({ data, className }: ExposureTrendChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Exposure Trend (7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis 
                dataKey="date" 
                stroke="#64748B"
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
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
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                }}
                labelStyle={{ color: '#475569', fontWeight: 600 }}
              />
              <ReferenceLine 
                y={50} 
                stroke="#A7F3D0" 
                strokeDasharray="5 5" 
                label={{ value: 'Good', fill: '#065F46', fontSize: 10 }}
              />
              <ReferenceLine 
                y={100} 
                stroke="#FDE68A" 
                strokeDasharray="5 5"
                label={{ value: 'Moderate', fill: '#92400E', fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="cityAQI"
                stroke="#CBD5E1"
                strokeWidth={2}
                dot={false}
                name="City AQI"
              />
              <Line
                type="monotone"
                dataKey="personalScore"
                stroke="#94A3B8"
                strokeWidth={3}
                dot={{ fill: '#94A3B8', r: 4 }}
                activeDot={{ r: 6, fill: '#94A3B8' }}
                name="Your Exposure"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Your Exposure</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-sm text-muted-foreground">City AQI</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
