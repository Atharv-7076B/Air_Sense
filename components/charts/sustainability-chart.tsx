'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { Card, CardContent, Badge, Select } from '@/components/ui'
import type { HistoricalDataPoint, YearComparison, TrendSummary } from '@/lib/historical-aqi'
import { TrendingUp, TrendingDown, Minus, Leaf } from 'lucide-react'

interface SustainabilityChartProps {
  data: HistoricalDataPoint[]
  yearOverYear: YearComparison[]
  summary: TrendSummary
  city: string
}

export function SustainabilityChart({
  data,
  yearOverYear,
  summary,
  city,
}: SustainabilityChartProps) {
  const [pollutant, setPollutant] = useState<'pm25' | 'pm10' | 'aqi'>('pm25')
  const [chartView, setChartView] = useState<'trend' | 'yearly'>('trend')

  const pollutantOptions = [
    { value: 'pm25', label: 'PM2.5' },
    { value: 'pm10', label: 'PM10' },
    { value: 'aqi', label: 'AQI' },
  ]

  const viewOptions = [
    { value: 'trend', label: 'Monthly Trend' },
    { value: 'yearly', label: 'Year Comparison' },
  ]

  const trendIcon = summary.pm25Trend === 'improving' ? (
    <TrendingDown className="w-4 h-4 text-emerald-500" />
  ) : summary.pm25Trend === 'worsening' ? (
    <TrendingUp className="w-4 h-4 text-red-500" />
  ) : (
    <Minus className="w-4 h-4 text-amber-500" />
  )

  const trendColor = summary.pm25Trend === 'improving' ? 'text-emerald-500' : summary.pm25Trend === 'worsening' ? 'text-red-500' : 'text-amber-500'

  // Filter out data points where the selected pollutant is null, then format labels
  const filteredData = data.filter(d => d[pollutant] !== null)
  const chartData = filteredData.map((d, i) => ({
    ...d,
    label: i % 3 === 0 ? d.date : '',
    displayDate: d.date,
  }))

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Sustainability Score</p>
            <div className="flex items-center gap-2 mt-1">
              <Leaf className={`w-4 h-4 ${
                summary.sustainabilityScore > 60 ? 'text-emerald-500' :
                summary.sustainabilityScore > 40 ? 'text-amber-500' : 'text-red-500'
              }`} />
              <span className="text-2xl font-bold text-foreground">{summary.sustainabilityScore}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Avg PM2.5</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {summary.avgPM25 ?? 'N/A'}
              <span className="text-xs font-normal text-muted-foreground ml-1">µg/m³</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">PM2.5 Trend</p>
            <div className="flex items-center gap-2 mt-1">
              {trendIcon}
              <span className={`text-lg font-bold ${trendColor}`}>
                {summary.pm25ChangePercent > 0 ? '+' : ''}{summary.pm25ChangePercent}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Data Points</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {summary.totalMonths}
              <span className="text-xs font-normal text-muted-foreground ml-1">months</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          options={viewOptions}
          value={chartView}
          onChange={(e) => setChartView(e.target.value as 'trend' | 'yearly')}
          className="w-40"
        />
        <Select
          options={pollutantOptions}
          value={pollutant}
          onChange={(e) => setPollutant(e.target.value as 'pm25' | 'pm10' | 'aqi')}
          className="w-32"
        />
        <Badge variant="default" size="sm">
          {city} · {filteredData.length > 0 ? filteredData[0].date : ''} to {filteredData.length > 0 ? filteredData[filteredData.length - 1].date : ''}
        </Badge>
      </div>

      {/* Charts */}
      <Card>
        <CardContent className="pt-4">
          {chartView === 'trend' ? (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-4">
                {pollutant === 'pm25' ? 'PM2.5' : pollutant === 'pm10' ? 'PM10' : 'AQI'} Monthly Trend — {city}
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    stroke="var(--border)"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    stroke="var(--border)"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(_, payload) => {
                      if (payload && payload.length > 0) {
                        return payload[0].payload.displayDate
                      }
                      return ''
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={pollutant}
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 2, fill: 'var(--primary)' }}
                    connectNulls
                    name={pollutant === 'pm25' ? 'PM2.5 (µg/m³)' : pollutant === 'pm10' ? 'PM10 (µg/m³)' : 'AQI'}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-4">
                Year-over-Year Comparison — {city}
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={yearOverYear}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                    stroke="var(--border)"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    stroke="var(--border)"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey={pollutant === 'pm25' ? 'avgPM25' : pollutant === 'pm10' ? 'avgPM10' : 'avgAQI'}
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                    name={pollutant === 'pm25' ? 'Avg PM2.5' : pollutant === 'pm10' ? 'Avg PM10' : 'Avg AQI'}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yearly Summary Table */}
      {yearOverYear.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Statistical Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Year</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Avg PM2.5</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Avg PM10</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Avg AQI</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Hazardous Months</th>
                  </tr>
                </thead>
                <tbody>
                  {yearOverYear.map((year) => (
                    <tr key={year.year} className="border-b border-border/50">
                      <td className="py-2 font-medium text-foreground">{year.year}</td>
                      <td className="py-2 text-right text-foreground">{year.avgPM25 ?? 'N/A'}</td>
                      <td className="py-2 text-right text-foreground">{year.avgPM10 ?? 'N/A'}</td>
                      <td className="py-2 text-right text-foreground">{year.avgAQI ?? 'N/A'}</td>
                      <td className="py-2 text-right">
                        <Badge
                          variant={year.hazardousDays > 3 ? 'danger' : year.hazardousDays > 0 ? 'warning' : 'success'}
                          size="sm"
                        >
                          {year.hazardousDays}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
