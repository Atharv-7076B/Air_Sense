'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'

interface ActivityBreakdownChartProps {
  data: {
    activity: string
    minutes: number
    indoor: boolean
  }[]
  className?: string
}

// Color palette for charts
const _COLORS = [
  '#94A3B8', // primary
  '#A7F3D0', // success
  '#FDE68A', // warning
  '#FECACA', // danger
  '#CBD5E1', // accent
  '#E2E8F0', // border
]

export function ActivityBreakdownChart({ data, className }: ActivityBreakdownChartProps) {
  // Group by indoor/outdoor
  const indoorMinutes = data.filter(d => d.indoor).reduce((sum, d) => sum + d.minutes, 0)
  const outdoorMinutes = data.filter(d => !d.indoor).reduce((sum, d) => sum + d.minutes, 0)
  
  const pieData = [
    { name: 'Indoor', value: indoorMinutes },
    { name: 'Outdoor', value: outdoorMinutes },
  ]

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Indoor vs Outdoor Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === 0 ? '#A7F3D0' : '#FDE68A'} 
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                }}
                formatter={(value) => [`${Math.round((value as number) / 60)} hrs`, '']}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-center p-3 rounded-lg bg-success/20">
            <p className="text-2xl font-bold text-success-foreground">
              {Math.round(indoorMinutes / 60)}h
            </p>
            <p className="text-xs text-muted-foreground">Indoor (Protected)</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-warning/20">
            <p className="text-2xl font-bold text-warning-foreground">
              {Math.round(outdoorMinutes / 60)}h
            </p>
            <p className="text-xs text-muted-foreground">Outdoor (Exposed)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
