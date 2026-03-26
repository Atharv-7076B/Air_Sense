// Historical AQI Data Service
// Fetches real historical air pollution data from OpenWeatherMap and OpenMeteo APIs
// NO fake/simulated data — real API calls only

import { prisma } from './prisma'

export interface HistoricalDataPoint {
  date: string // ISO date string (YYYY-MM)
  pm25: number | null
  pm10: number | null
  o3: number | null
  no2: number | null
  so2: number | null
  co: number | null
  aqi: number | null
  source: string
}

export interface HistoricalTrend {
  city: string
  data: HistoricalDataPoint[]
  yearOverYear: YearComparison[]
  summary: TrendSummary
}

export interface YearComparison {
  year: number
  avgPM25: number | null
  avgPM10: number | null
  avgAQI: number | null
  hazardousDays: number
}

export interface TrendSummary {
  totalMonths: number
  avgPM25: number | null
  avgPM10: number | null
  pm25Trend: 'improving' | 'stable' | 'worsening'
  pm25ChangePercent: number
  sustainabilityScore: number // 0-100
}

// City coordinates for API calls
export const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  delhi: { lat: 28.6139, lon: 77.2090 },
  mumbai: { lat: 19.0760, lon: 72.8777 },
  pune: { lat: 18.5204, lon: 73.8567 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  hyderabad: { lat: 17.3850, lon: 78.4867 },
  ahmedabad: { lat: 23.0225, lon: 72.5714 },
  jaipur: { lat: 26.9124, lon: 75.7873 },
  lucknow: { lat: 26.8467, lon: 80.9462 },
}

// EPA AQI breakpoints for PM2.5 (µg/m³, 24-hour average)
function pm25ToAQI(pm25: number): number {
  const breakpoints = [
    { cLow: 0, cHigh: 12.0, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 350.4, iLow: 301, iHigh: 400 },
    { cLow: 350.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
  ]

  for (const bp of breakpoints) {
    if (pm25 >= bp.cLow && pm25 <= bp.cHigh) {
      return Math.round(
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (pm25 - bp.cLow) + bp.iLow
      )
    }
  }
  return pm25 > 500.4 ? 500 : 0
}

// Fetch historical data from OpenWeatherMap Air Pollution API
// Note: Free tier limited to ~60 calls/min. Data available from Nov 27, 2020 onwards.
async function fetchOpenWeatherMapHistory(
  lat: number,
  lon: number,
  startUnix: number,
  endUnix: number
): Promise<{ dt: number; pm25: number; pm10: number; o3: number; no2: number; so2: number; co: number }[]> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  if (!apiKey) {
    throw new Error('OPENWEATHERMAP_API_KEY is not set')
  }

  const url = `https://api.openweathermap.org/data/2.5/air_pollution/history?lat=${lat}&lon=${lon}&start=${startUnix}&end=${endUnix}&appid=${apiKey}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`OpenWeatherMap API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  if (!data.list || data.list.length === 0) {
    return []
  }

  return data.list.map((item: { dt: number; components: Record<string, number> }) => ({
    dt: item.dt,
    pm25: item.components.pm2_5 ?? 0,
    pm10: item.components.pm10 ?? 0,
    o3: item.components.o3 ?? 0,
    no2: item.components.no2 ?? 0,
    so2: item.components.so2 ?? 0,
    co: item.components.co ?? 0,
  }))
}

// Fetch historical data from OpenMeteo Air Quality API (free, no key needed)
// Provides data from 2022 onwards with hourly granularity
async function fetchOpenMeteoHistory(
  lat: number,
  lon: number,
  startDate: string, // YYYY-MM-DD
  endDate: string
): Promise<{ date: string; pm25: number; pm10: number; o3: number; no2: number; so2: number }[]> {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&hourly=pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`OpenMeteo API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  if (!data.hourly || !data.hourly.time) {
    return []
  }

  return data.hourly.time.map((time: string, i: number) => ({
    date: time,
    pm25: data.hourly.pm2_5?.[i] ?? 0,
    pm10: data.hourly.pm10?.[i] ?? 0,
    o3: data.hourly.ozone?.[i] ?? 0,
    no2: data.hourly.nitrogen_dioxide?.[i] ?? 0,
    so2: data.hourly.sulphur_dioxide?.[i] ?? 0,
  }))
}

// Aggregate hourly data into monthly averages
function aggregateToMonthly(
  data: { dt?: number; date?: string; pm25: number; pm10: number; o3: number; no2: number; so2: number; co?: number }[],
  source: string
): HistoricalDataPoint[] {
  const monthlyBuckets: Record<string, { pm25: number[]; pm10: number[]; o3: number[]; no2: number[]; so2: number[]; co: number[] }> = {}

  for (const item of data) {
    let date: Date
    if (item.dt) {
      date = new Date(item.dt * 1000)
    } else if (item.date) {
      date = new Date(item.date)
    } else {
      continue
    }

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!monthlyBuckets[monthKey]) {
      monthlyBuckets[monthKey] = { pm25: [], pm10: [], o3: [], no2: [], so2: [], co: [] }
    }

    if (item.pm25 > 0) monthlyBuckets[monthKey].pm25.push(item.pm25)
    if (item.pm10 > 0) monthlyBuckets[monthKey].pm10.push(item.pm10)
    if (item.o3 > 0) monthlyBuckets[monthKey].o3.push(item.o3)
    if (item.no2 > 0) monthlyBuckets[monthKey].no2.push(item.no2)
    if (item.so2 > 0) monthlyBuckets[monthKey].so2.push(item.so2)
    if (item.co && item.co > 0) monthlyBuckets[monthKey].co.push(item.co)
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null

  return Object.entries(monthlyBuckets)
    .map(([month, values]) => {
      const avgPM25 = avg(values.pm25)
      return {
        date: month,
        pm25: avgPM25 ? Math.round(avgPM25 * 10) / 10 : null,
        pm10: avg(values.pm10) ? Math.round(avg(values.pm10)! * 10) / 10 : null,
        o3: avg(values.o3) ? Math.round(avg(values.o3)! * 10) / 10 : null,
        no2: avg(values.no2) ? Math.round(avg(values.no2)! * 10) / 10 : null,
        so2: avg(values.so2) ? Math.round(avg(values.so2)! * 10) / 10 : null,
        co: avg(values.co) ? Math.round(avg(values.co)! * 10) / 10 : null,
        aqi: avgPM25 ? pm25ToAQI(avgPM25) : null,
        source,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Calculate trend analysis
function calculateTrend(data: HistoricalDataPoint[]): TrendSummary {
  const pm25Values = data.filter(d => d.pm25 !== null).map(d => d.pm25!)
  const pm10Values = data.filter(d => d.pm10 !== null).map(d => d.pm10!)
  const aqiValues = data.filter(d => d.aqi !== null).map(d => d.aqi!)

  const avgPM25 = pm25Values.length > 0 ? Math.round(pm25Values.reduce((a, b) => a + b, 0) / pm25Values.length * 10) / 10 : null
  const avgPM10 = pm10Values.length > 0 ? Math.round(pm10Values.reduce((a, b) => a + b, 0) / pm10Values.length * 10) / 10 : null

  // Calculate trend: compare first half vs second half
  let pm25Trend: 'improving' | 'stable' | 'worsening' = 'stable'
  let pm25ChangePercent = 0

  if (pm25Values.length >= 6) {
    const mid = Math.floor(pm25Values.length / 2)
    const firstHalf = pm25Values.slice(0, mid)
    const secondHalf = pm25Values.slice(mid)
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

    pm25ChangePercent = Math.round(((secondAvg - firstAvg) / firstAvg) * 100)

    if (pm25ChangePercent <= -10) pm25Trend = 'improving'
    else if (pm25ChangePercent >= 10) pm25Trend = 'worsening'
  }

  // Sustainability score: lower AQI + improving trend = higher score
  let sustainabilityScore = 50
  if (avgPM25 !== null) {
    // Base score from absolute level (0-50 points)
    if (avgPM25 < 12) sustainabilityScore = 95
    else if (avgPM25 < 35) sustainabilityScore = 75
    else if (avgPM25 < 55) sustainabilityScore = 55
    else if (avgPM25 < 150) sustainabilityScore = 35
    else sustainabilityScore = 15

    // Adjust for trend (-20 to +20 points)
    sustainabilityScore += Math.max(-20, Math.min(20, -pm25ChangePercent))
    sustainabilityScore = Math.max(0, Math.min(100, sustainabilityScore))
  }

  return {
    totalMonths: data.length,
    avgPM25,
    avgPM10,
    pm25Trend,
    pm25ChangePercent,
    sustainabilityScore: Math.round(sustainabilityScore),
  }
}

// Calculate year-over-year comparison
function calculateYearOverYear(data: HistoricalDataPoint[]): YearComparison[] {
  const yearBuckets: Record<number, { pm25: number[]; pm10: number[]; aqi: number[]; hazardous: number }> = {}

  for (const point of data) {
    const year = parseInt(point.date.split('-')[0])
    if (!yearBuckets[year]) {
      yearBuckets[year] = { pm25: [], pm10: [], aqi: [], hazardous: 0 }
    }
    if (point.pm25 !== null) yearBuckets[year].pm25.push(point.pm25)
    if (point.pm10 !== null) yearBuckets[year].pm10.push(point.pm10)
    if (point.aqi !== null) {
      yearBuckets[year].aqi.push(point.aqi)
      if (point.aqi > 300) yearBuckets[year].hazardous++
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null

  return Object.entries(yearBuckets)
    .map(([year, values]) => ({
      year: parseInt(year),
      avgPM25: avg(values.pm25),
      avgPM10: avg(values.pm10),
      avgAQI: avg(values.aqi),
      hazardousDays: values.hazardous,
    }))
    .sort((a, b) => a.year - b.year)
}

// Main function: fetch historical AQI data for a city
// Uses database cache to avoid redundant API calls
export async function getHistoricalAQI(
  city: string,
  years: number = 7
): Promise<HistoricalTrend> {
  const cityKey = city.toLowerCase()
  const coords = CITY_COORDINATES[cityKey]

  if (!coords) {
    throw new Error(`City "${city}" not found. Available cities: ${Object.keys(CITY_COORDINATES).join(', ')}`)
  }

  // Check database cache first
  const cachedData = await prisma.historicalAQI.findMany({
    where: {
      city: cityKey,
      period: 'monthly',
    },
    orderBy: { date: 'asc' },
  })

  if (cachedData.length > 12) {
    // Have substantial cached data — use it
    const data: HistoricalDataPoint[] = cachedData.map(d => ({
      date: `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}`,
      pm25: d.pm25,
      pm10: d.pm10,
      o3: d.o3,
      no2: d.no2,
      so2: d.so2,
      co: d.co,
      aqi: d.aqi,
      source: d.source,
    }))

    return {
      city,
      data,
      yearOverYear: calculateYearOverYear(data),
      summary: calculateTrend(data),
    }
  }

  // Fetch from APIs
  const now = new Date()
  const startDate = new Date(now.getFullYear() - years, now.getMonth(), 1)

  let allData: HistoricalDataPoint[] = []

  // Try OpenWeatherMap first (primary source)
  // OWM historical data is available from Nov 27, 2020
  const owmStartDate = new Date(Math.max(startDate.getTime(), new Date('2020-11-27').getTime()))

  try {
    // Fetch in chunks of 30 days to respect API limits
    const chunks: { dt: number; pm25: number; pm10: number; o3: number; no2: number; so2: number; co: number }[] = []
    let chunkStart = owmStartDate

    while (chunkStart < now) {
      const chunkEnd = new Date(Math.min(
        chunkStart.getTime() + 30 * 24 * 60 * 60 * 1000,
        now.getTime()
      ))

      const chunkData = await fetchOpenWeatherMapHistory(
        coords.lat,
        coords.lon,
        Math.floor(chunkStart.getTime() / 1000),
        Math.floor(chunkEnd.getTime() / 1000)
      )
      chunks.push(...chunkData)
      chunkStart = chunkEnd

      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    if (chunks.length > 0) {
      allData = aggregateToMonthly(chunks, 'openweathermap')
    }
  } catch (error) {
    console.error('OpenWeatherMap historical fetch failed:', error)
  }

  // If OWM failed or has insufficient data, try OpenMeteo as backup
  if (allData.length < 12) {
    try {
      const meteoStartDate = startDate.toISOString().split('T')[0]
      const meteoEndDate = now.toISOString().split('T')[0]

      const meteoData = await fetchOpenMeteoHistory(
        coords.lat,
        coords.lon,
        meteoStartDate,
        meteoEndDate
      )

      if (meteoData.length > 0) {
        const meteoMonthly = aggregateToMonthly(
          meteoData.map(d => ({ ...d, co: 0 })),
          'openmeteo'
        )

        // If OWM data exists, merge (OWM takes priority for overlapping months)
        if (allData.length > 0) {
          const existingMonths = new Set(allData.map(d => d.date))
          const newMonths = meteoMonthly.filter(d => !existingMonths.has(d.date))
          allData = [...allData, ...newMonths].sort((a, b) => a.date.localeCompare(b.date))
        } else {
          allData = meteoMonthly
        }
      }
    } catch (error) {
      console.error('OpenMeteo historical fetch failed:', error)
    }
  }

  if (allData.length === 0) {
    throw new Error(`No historical data available for ${city}. Both OpenWeatherMap and OpenMeteo APIs failed.`)
  }

  // Cache results in database
  for (const point of allData) {
    const [yearStr, monthStr] = point.date.split('-')
    const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1)

    try {
      await prisma.historicalAQI.upsert({
        where: {
          city_date_period: {
            city: cityKey,
            date,
            period: 'monthly',
          },
        },
        update: {
          pm25: point.pm25,
          pm10: point.pm10,
          o3: point.o3,
          no2: point.no2,
          so2: point.so2,
          co: point.co,
          aqi: point.aqi,
          source: point.source,
        },
        create: {
          city: cityKey,
          lat: coords.lat,
          lon: coords.lon,
          date,
          pm25: point.pm25,
          pm10: point.pm10,
          o3: point.o3,
          no2: point.no2,
          so2: point.so2,
          co: point.co,
          aqi: point.aqi,
          source: point.source,
          period: 'monthly',
        },
      })
    } catch {
      // Skip duplicate/conflict errors silently
    }
  }

  return {
    city,
    data: allData,
    yearOverYear: calculateYearOverYear(allData),
    summary: calculateTrend(allData),
  }
}

// Get coordinates for a city (for use by other modules)
export function getCityCoordinates(city: string): { lat: number; lon: number } | null {
  return CITY_COORDINATES[city.toLowerCase()] || null
}
