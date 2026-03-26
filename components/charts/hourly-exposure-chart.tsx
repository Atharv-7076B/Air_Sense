'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface HourlyExposureChartProps {
  data: {
    hour: number
    exposure: number
  }[]
  className?: string
}

export function HourlyExposureChart({ data, className }: HourlyExposureChartProps) {
  const formattedData = data.map(d => ({
    ...d,
    time: formatHour(d.hour),
    fill: d.exposure <= 50 ? '#A7F3D0' : d.exposure <= 100 ? '#FDE68A' : '#FECACA',
  }))

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Hourly Exposure Today</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                interval={2}
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
                }}
                labelFormatter={(label) => `Time: ${label}`}
                formatter={(value) => [`${value} AQI`, 'Exposure']}
              />
              <ReferenceLine y={50} stroke="#A7F3D0" strokeDasharray="5 5" />
              <ReferenceLine y={100} stroke="#FDE68A" strokeDasharray="5 5" />
              <Bar 
                dataKey="exposure" 
                radius={[4, 4, 0, 0]}
                fill="#94A3B8"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-success" /> Good (≤50)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-warning" /> Moderate (51-100)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-danger" /> Unhealthy ({'>'}100)
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function formatHour(hour: number): string {
  if (hour === 0) return '12AM'
  if (hour === 12) return '12PM'
  if (hour < 12) return `${hour}AM`
  return `${hour - 12}PM`
}
