// AQI Client — Real data from WAQI + IQAir APIs
// WAQI: https://aqicn.org/api/ | IQAir: https://api-docs.iqair.com/

export interface AQIData {
  city: string
  aqi: number
  pm25: number | null
  pm10: number | null
  o3: number | null
  no2: number | null
  so2: number | null
  co: number | null
  temperature: number | null
  humidity: number | null
  wind: number | null
  timestamp: Date
  dominantPollutant: string
  source: 'waqi' | 'iqair' | 'simulated'
}

export interface AQIForecast {
  day: string
  avg: number
  min: number
  max: number
}

// ── API Tokens ────────────────────────────────────────────────────

function getWAQIToken(): string | null {
  return process.env.WAQI_API_KEY || process.env.WAQI_API_TOKEN || null
}

function getIQAirKey(): string | null {
  return process.env.IQAIR_API_KEY || null
}

// ── WAQI API ──────────────────────────────────────────────────────

const WAQI_API_BASE = 'https://api.waqi.info'

function parseWAQIResponse(aqiData: Record<string, unknown>, cityFallback: string): AQIData {
  const iaqi = aqiData.iaqi as Record<string, { v: number }> | undefined
  const city = aqiData.city as { name?: string } | undefined
  const time = aqiData.time as { iso?: string } | undefined

  return {
    city: city?.name || cityFallback,
    aqi: aqiData.aqi as number,
    pm25: iaqi?.pm25?.v ?? null,
    pm10: iaqi?.pm10?.v ?? null,
    o3: iaqi?.o3?.v ?? null,
    no2: iaqi?.no2?.v ?? null,
    so2: iaqi?.so2?.v ?? null,
    co: iaqi?.co?.v ?? null,
    temperature: iaqi?.t?.v ?? null,
    humidity: iaqi?.h?.v ?? null,
    wind: iaqi?.w?.v ?? null,
    timestamp: new Date(time?.iso || Date.now()),
    dominantPollutant: (aqiData.dominentpol as string) || 'pm25',
    source: 'waqi',
  }
}

async function fetchWAQIByName(city: string, token: string): Promise<AQIData | null> {
  try {
    const response = await fetch(
      `${WAQI_API_BASE}/feed/${encodeURIComponent(city)}/?token=${token}`,
      { next: { revalidate: 300 } }
    )
    if (!response.ok) return null
    const data = await response.json()
    if (data.status !== 'ok' || !data.data) return null
    return parseWAQIResponse(data.data, city)
  } catch {
    return null
  }
}

async function fetchWAQIByCoords(lat: number, lon: number, token: string): Promise<AQIData | null> {
  try {
    const response = await fetch(
      `${WAQI_API_BASE}/feed/geo:${lat};${lon}/?token=${token}`,
      { next: { revalidate: 300 } }
    )
    if (!response.ok) return null
    const data = await response.json()
    if (data.status !== 'ok' || !data.data) return null
    return parseWAQIResponse(data.data, `${lat.toFixed(2)}, ${lon.toFixed(2)}`)
  } catch {
    return null
  }
}

// ── IQAir API ─────────────────────────────────────────────────────

const IQAIR_API_BASE = 'https://api.airvisual.com/v2'

async function fetchIQAirByCoords(lat: number, lon: number, key: string): Promise<AQIData | null> {
  try {
    const response = await fetch(
      `${IQAIR_API_BASE}/nearest_city?lat=${lat}&lon=${lon}&key=${key}`,
      { next: { revalidate: 300 } }
    )
    if (!response.ok) return null
    const data = await response.json()
    if (data.status !== 'success' || !data.data) return null

    const { data: d } = data
    const pollution = d.current?.pollution
    const weather = d.current?.weather

    return {
      city: d.city || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      aqi: pollution?.aqius ?? 0,
      pm25: null, // IQAir free tier doesn't return individual pollutant concentrations
      pm10: null,
      o3: null,
      no2: null,
      so2: null,
      co: null,
      temperature: weather?.tp ?? null,
      humidity: weather?.hu ?? null,
      wind: weather?.ws ?? null,
      timestamp: new Date(pollution?.ts || Date.now()),
      dominantPollutant: pollution?.mainus || 'p2',
      source: 'iqair',
    }
  } catch {
    return null
  }
}

// ── Geocoding (Nominatim) ─────────────────────────────────────────

async function geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'AirSense/1.0' } }
    )
    if (!response.ok) return null
    const results = await response.json()
    if (results.length === 0) return null
    return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) }
  } catch {
    return null
  }
}

// ── Weather enrichment (OpenWeatherMap) ───────────────────────────

async function enrichWeather(data: AQIData, city: string, coords?: { lat: number; lon: number } | null): Promise<AQIData> {
  const owmKey = process.env.OPENWEATHERMAP_API_KEY
  if (!owmKey) return data

  // Only enrich if weather data looks suspicious or missing
  const tempSuspicious = data.temperature === null || data.temperature < -10 || data.temperature > 55
  const windSuspicious = data.wind === null || data.wind > 40
  if (!tempSuspicious && !windSuspicious) return data

  try {
    const query = coords
      ? `lat=${coords.lat}&lon=${coords.lon}`
      : `q=${encodeURIComponent(city)}`
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?${query}&appid=${owmKey}&units=metric`,
      { next: { revalidate: 300 } }
    )
    if (!response.ok) return data
    const weather = await response.json()

    return {
      ...data,
      temperature: weather.main?.temp ?? data.temperature,
      humidity: weather.main?.humidity ?? data.humidity,
      wind: weather.wind?.speed ?? data.wind,
    }
  } catch {
    return data
  }
}

// ── Primary getAQI function ───────────────────────────────────────

/**
 * Get real AQI data for any city. Strategy:
 * 1. Try WAQI by city name (works for major cities)
 * 2. Geocode city → try WAQI by lat/lon (nearest station)
 * 3. Geocode city → try IQAir by lat/lon (interpolated data, covers everywhere)
 * 4. Fall back to simulated data
 */
export async function getAQI(city: string): Promise<AQIData> {
  const waqiToken = getWAQIToken()
  const iqairKey = getIQAirKey()
  let coords: { lat: number; lon: number } | null = null

  // 1. Try WAQI by city name
  if (waqiToken) {
    const byName = await fetchWAQIByName(city, waqiToken)
    if (byName) {
      byName.city = city
      return enrichWeather(byName, city)
    }
  }

  // 2+3. Geocode, then try WAQI coords → IQAir coords
  coords = await geocodeCity(city)
  if (coords) {
    if (waqiToken) {
      const byCoords = await fetchWAQIByCoords(coords.lat, coords.lon, waqiToken)
      if (byCoords) {
        byCoords.city = city
        return enrichWeather(byCoords, city, coords)
      }
    }

    if (iqairKey) {
      const iqair = await fetchIQAirByCoords(coords.lat, coords.lon, iqairKey)
      if (iqair) {
        iqair.city = city
        return enrichWeather(iqair, city, coords)
      }
    }
  }

  // 4. Simulated fallback
  console.warn(`[AQI] Using simulated data for "${city}" — no API key or all APIs failed`)
  return getSimulatedAQI(city)
}

/** Get AQI by coordinates directly */
export async function getAQIByCoords(lat: number, lon: number, cityName: string): Promise<AQIData> {
  const waqiToken = getWAQIToken()
  const iqairKey = getIQAirKey()
  const coords = { lat, lon }

  if (waqiToken) {
    const data = await fetchWAQIByCoords(lat, lon, waqiToken)
    if (data) {
      data.city = cityName
      return enrichWeather(data, cityName, coords)
    }
  }

  if (iqairKey) {
    const data = await fetchIQAirByCoords(lat, lon, iqairKey)
    if (data) {
      data.city = cityName
      return enrichWeather(data, cityName, coords)
    }
  }

  return getSimulatedAQI(cityName)
}

// Keep old exports for backward compatibility during migration
export { fetchWAQIByName as fetchAQIFromAPI }
export { fetchWAQIByCoords as fetchAQIByCoords }

// ── Simulated fallback ────────────────────────────────────────────

const INDIAN_CITIES_AQI: Record<string, Partial<AQIData>> = {
  delhi: { aqi: 285, pm25: 185, pm10: 220, o3: 45, no2: 65, dominantPollutant: 'pm25' },
  mumbai: { aqi: 145, pm25: 78, pm10: 95, o3: 38, no2: 42, dominantPollutant: 'pm25' },
  pune: { aqi: 125, pm25: 65, pm10: 82, o3: 35, no2: 38, dominantPollutant: 'pm25' },
  bangalore: { aqi: 95, pm25: 48, pm10: 65, o3: 32, no2: 35, dominantPollutant: 'pm25' },
  chennai: { aqi: 110, pm25: 55, pm10: 72, o3: 40, no2: 38, dominantPollutant: 'pm25' },
  kolkata: { aqi: 165, pm25: 95, pm10: 115, o3: 42, no2: 55, dominantPollutant: 'pm25' },
  hyderabad: { aqi: 105, pm25: 52, pm10: 68, o3: 35, no2: 40, dominantPollutant: 'pm25' },
  ahmedabad: { aqi: 155, pm25: 85, pm10: 102, o3: 45, no2: 48, dominantPollutant: 'pm25' },
  jaipur: { aqi: 175, pm25: 98, pm10: 125, o3: 48, no2: 52, dominantPollutant: 'pm25' },
  lucknow: { aqi: 195, pm25: 115, pm10: 145, o3: 42, no2: 58, dominantPollutant: 'pm25' },
}

function addVariance(baseValue: number, variance: number = 0.15): number {
  const factor = 1 + (Math.random() - 0.5) * 2 * variance
  return Math.round(baseValue * factor)
}

export function getSimulatedAQI(city: string): AQIData {
  const normalizedCity = city.toLowerCase().replace(/\s+/g, '')
  const baseData = INDIAN_CITIES_AQI[normalizedCity] || INDIAN_CITIES_AQI['mumbai']

  return {
    city,
    aqi: addVariance(baseData.aqi || 100),
    pm25: baseData.pm25 ? addVariance(baseData.pm25) : null,
    pm10: baseData.pm10 ? addVariance(baseData.pm10) : null,
    o3: baseData.o3 ? addVariance(baseData.o3) : null,
    no2: baseData.no2 ? addVariance(baseData.no2) : null,
    so2: Math.round(Math.random() * 15 + 5),
    co: Math.round(Math.random() * 10 + 2) / 10,
    temperature: Math.round(Math.random() * 15 + 20),
    humidity: Math.round(Math.random() * 40 + 40),
    wind: Math.round(Math.random() * 20 + 5) / 10,
    timestamp: new Date(),
    dominantPollutant: baseData.dominantPollutant || 'pm25',
    source: 'simulated',
  }
}

export function getSimulatedForecast(city: string, days: number = 7): AQIForecast[] {
  const baseAQI = getSimulatedAQI(city).aqi
  const forecast: AQIForecast[] = []
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    const dayOfWeek = date.getDay()
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.9 : 1.0
    const avgAQI = Math.round(baseAQI * weekendFactor * (0.85 + Math.random() * 0.3))
    forecast.push({
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      avg: avgAQI,
      min: Math.round(avgAQI * 0.7),
      max: Math.round(avgAQI * 1.3),
    })
  }
  return forecast
}

// ── AQI Category helpers ──────────────────────────────────────────

export function getAQICategory(aqi: number): {
  level: string
  description: string
  healthImplications: string
  color: string
  bgColor: string
} {
  if (aqi <= 50) {
    return { level: 'Good', description: 'Air quality is satisfactory', healthImplications: 'Air quality is considered satisfactory, and air pollution poses little or no risk.', color: 'text-success-foreground', bgColor: 'bg-success' }
  } else if (aqi <= 100) {
    return { level: 'Moderate', description: 'Air quality is acceptable', healthImplications: 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.', color: 'text-warning-foreground', bgColor: 'bg-warning' }
  } else if (aqi <= 150) {
    return { level: 'Unhealthy (SG)', description: 'Sensitive groups may experience health effects', healthImplications: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.', color: 'text-warning-foreground', bgColor: 'bg-warning' }
  } else if (aqi <= 200) {
    return { level: 'Unhealthy', description: 'Everyone may experience health effects', healthImplications: 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.', color: 'text-danger-foreground', bgColor: 'bg-danger' }
  } else if (aqi <= 300) {
    return { level: 'Very Unhealthy', description: 'Health alert - increased health effects', healthImplications: 'Health alert: The risk of health effects is increased for everyone.', color: 'text-danger-foreground', bgColor: 'bg-danger' }
  } else {
    return { level: 'Hazardous', description: 'Health emergency', healthImplications: 'Health warning of emergency conditions: everyone is more likely to be affected.', color: 'text-danger-foreground', bgColor: 'bg-danger' }
  }
}

export const SUPPORTED_CITIES = [
  'Delhi', 'Mumbai', 'Pune', 'Bangalore', 'Chennai',
  'Kolkata', 'Hyderabad', 'Ahmedabad', 'Jaipur', 'Lucknow',
]
