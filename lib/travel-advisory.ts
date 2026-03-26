// Travel Advisory System
// Compares origin and destination air quality with health-profile-aware warnings

import { getTravelKit, type ProductRecommendation } from './product-recommendations'

export interface TravelAdvisoryInput {
  originCity: string
  originAQI: number
  destinationCity: string
  destinationAQI: number
  travelDate: string
  healthVulnerability?: number // 1.0-3.0
  forecastedDestAQI?: number
}

export interface TravelAdvisory {
  level: 'safe' | 'caution' | 'warning' | 'danger'
  summary: string
  details: string[]
  aqiComparison: {
    origin: number
    destination: number
    change: number
    direction: 'better' | 'same' | 'worse'
  }
  preparations: string[]
  travelKit: ProductRecommendation[]
}

export function generateTravelAdvisory(input: TravelAdvisoryInput): TravelAdvisory {
  const aqiChange = input.destinationAQI - input.originAQI
  const direction = aqiChange < -20 ? 'better' : aqiChange > 20 ? 'worse' : 'same'

  const destAQI = input.forecastedDestAQI ?? input.destinationAQI
  const vulnerability = input.healthVulnerability ?? 1.0
  const effectiveAQI = destAQI * vulnerability

  // Determine advisory level
  let level: TravelAdvisory['level']
  if (effectiveAQI > 300) level = 'danger'
  else if (effectiveAQI > 200) level = 'warning'
  else if (effectiveAQI > 150 || (direction === 'worse' && destAQI > 100)) level = 'caution'
  else level = 'safe'

  // Generate summary
  let summary: string
  if (direction === 'better') {
    summary = `${input.originCity} → ${input.destinationCity}: Air quality improvement expected (AQI ${input.originAQI} → ${input.destinationAQI}).`
  } else if (direction === 'worse') {
    summary = `${input.originCity} → ${input.destinationCity}: Air quality will worsen (AQI ${input.originAQI} → ${input.destinationAQI}).`
  } else {
    summary = `${input.originCity} → ${input.destinationCity}: Similar air quality expected (AQI ${input.originAQI} → ${input.destinationAQI}).`
  }

  // Generate details
  const details: string[] = []

  if (destAQI > 200) {
    details.push('Destination air quality is in the hazardous range. Limit outdoor exposure.')
  } else if (destAQI > 150) {
    details.push('Destination air quality is unhealthy. Take precautions for outdoor activities.')
  } else if (destAQI > 100) {
    details.push('Destination air quality is moderate. Sensitive individuals should be cautious.')
  } else {
    details.push('Destination air quality is acceptable for most activities.')
  }

  if (vulnerability > 1.5) {
    details.push('Your health conditions increase sensitivity to pollution. Extra precautions recommended.')
  }

  if (aqiChange > 100) {
    details.push(`Significant AQI increase of ${Math.abs(aqiChange)} expected. Your body may need time to adjust.`)
  }

  // Preparations based on destination AQI
  const preparations: string[] = []

  if (destAQI > 200) {
    preparations.push('Pack N95 masks (minimum 2 per day)')
    preparations.push('Consider portable air purifier for hotel room')
    preparations.push('Carry rescue inhaler if you have asthma')
    preparations.push('Plan indoor activities as alternatives')
  } else if (destAQI > 150) {
    preparations.push('Pack N95 or KN95 masks')
    preparations.push('Limit outdoor exercise')
    preparations.push('Stay hydrated and take antioxidant supplements')
  } else if (destAQI > 100) {
    preparations.push('Keep masks handy for peak pollution hours')
    preparations.push('Check daily AQI before outdoor plans')
  } else {
    preparations.push('No special air quality preparations needed')
  }

  if (vulnerability > 1.3) {
    preparations.push('Carry all prescribed medications')
    preparations.push('Know nearest hospital at destination')
  }

  // Get travel kit recommendations
  const travelKit = getTravelKit(destAQI)

  return {
    level,
    summary,
    details,
    aqiComparison: {
      origin: input.originAQI,
      destination: input.destinationAQI,
      change: aqiChange,
      direction,
    },
    preparations,
    travelKit,
  }
}
