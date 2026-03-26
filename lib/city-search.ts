// City Search using OpenStreetMap Nominatim API (free, no API key)
// https://nominatim.org/release-docs/latest/api/Search/

export interface CitySearchResult {
  name: string
  displayName: string
  lat: number
  lon: number
  country: string
  state?: string
  type: string
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

export async function searchCities(query: string, limit: number = 5): Promise<CitySearchResult[]> {
  if (!query || query.length < 2) return []

  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&featuretype=city&addressdetails=1`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AirSense/1.0 (air-quality-tracker)',
      'Accept-Language': 'en',
    },
  })

  if (!response.ok) {
    throw new Error(`Nominatim API error: ${response.status}`)
  }

  const data = await response.json()

  return data
    .filter((item: { class: string; type: string }) =>
      item.class === 'place' || item.type === 'city' || item.type === 'town' || item.type === 'administrative'
    )
    .map((item: {
      display_name: string
      lat: string
      lon: string
      address?: { city?: string; town?: string; state?: string; country?: string }
      name?: string
      type: string
    }) => ({
      name: item.address?.city || item.address?.town || item.name || item.display_name.split(',')[0],
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      country: item.address?.country || '',
      state: item.address?.state,
      type: item.type,
    }))
}

export async function reverseGeocode(lat: number, lon: number): Promise<CitySearchResult | null> {
  const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AirSense/1.0 (air-quality-tracker)',
    },
  })

  if (!response.ok) return null

  const data = await response.json()

  return {
    name: data.address?.city || data.address?.town || data.display_name?.split(',')[0] || 'Unknown',
    displayName: data.display_name || '',
    lat: parseFloat(data.lat),
    lon: parseFloat(data.lon),
    country: data.address?.country || '',
    state: data.address?.state,
    type: data.type || 'place',
  }
}
