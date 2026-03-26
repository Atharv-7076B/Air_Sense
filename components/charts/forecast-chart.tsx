'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts'
import { Card, CardContent, Badge } from '@/components/ui'
import type { ForecastPoint } from '@/lib/arima-client'
import type { HistoricalDataPoint } from '@/lib/historical-aqi'
import { TrendingUp, AlertTriangle } from 'lucide-react'

interface ForecastChartProps {
  historical: HistoricalDataPoint[]
  forecast: ForecastPoint[]
  modelOrder: string
  city: string
}

export function ForecastChart({
  historical,
  forecast,
  modelOrder,
  city,
}: ForecastChartProps) {
  // Combine historical and forecast data
  const chartData = [
    ...historical.map(d => ({
      date: d.date,
      actual: d.aqi,
      forecast: null as number | null,
      lower: null as number | null,
      upper: null as number | null,
    })),
    // Bridge point: last historical connects to first forecast
    ...(historical.length > 0 && forecast.length > 0
      ? [{
          date: historical[historical.length - 1].date,
          actual: historical[historical.length - 1].aqi,
          forecast: historical[historical.length - 1].aqi,
          lower: historical[historical.length - 1].aqi,
          upper: historical[historical.length - 1].aqi,
        }]
      : []),
    ...forecast.map(d => ({
      date: d.date,
      actual: null as number | null,
      forecast: d.value,
      lower: d.lower_bound,
      upper: d.upper_bound,
    })),
  ]

  // Check if any forecast point crosses dangerous threshold
  const dangerousForecast = forecast.some(f => f.value > 200)
  const maxForecast = forecast.reduce((max, f) => Math.max(max, f.value), 0)

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">
              AQI Forecast — {city}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" size="sm">
              SARIMA {modelOrder}
            </Badge>
            {dangerousForecast && (
              <Badge variant="danger" size="sm">
                <AlertTriangle className="w-3 h-3 mr-1" />
                High AQI forecast
              </Badge>
            )}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--border))"
              interval={Math.max(1, Math.floor(chartData.length / 12))}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--border))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend />
            {/* Confidence interval band */}
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill="hsl(var(--primary))"
              fillOpacity={0.1}
              name="95% CI Upper"
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="none"
              fill="white"
              fillOpacity={1}
              name="95% CI Lower"
            />
            {/* Historical line */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              dot={false}
              name="Historical AQI"
              connectNulls={false}
            />
            {/* Forecast line */}
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Forecast AQI"
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Forecast Summary */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Next Month</p>
            <p className="text-lg font-bold text-foreground">
              {forecast.length > 0 ? Math.round(forecast[0].value) : 'N/A'}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">3-Month Avg</p>
            <p className="text-lg font-bold text-foreground">
              {forecast.length >= 3
                ? Math.round(forecast.slice(0, 3).reduce((s, f) => s + f.value, 0) / 3)
                : 'N/A'}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Peak Forecast</p>
            <p className={`text-lg font-bold ${maxForecast > 200 ? 'text-red-500' : maxForecast > 150 ? 'text-amber-500' : 'text-foreground'}`}>
              {Math.round(maxForecast)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
