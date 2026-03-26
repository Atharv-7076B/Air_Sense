// General Population Sustainability Index (GPSI)
// Calculates a population-level sustainability/health index for each city

import { getCityHealthData, type CityHealthStats } from './city-health-data'
import type { HistoricalDataPoint, TrendSummary } from './historical-aqi'

export interface GPSIResult {
  score: number // 0-100
  breakdown: GPSIBreakdown
  cityStats: CityHealthStats | null
  comparison: GPSIComparison | null
}

export interface GPSIBreakdown {
  environmental: { score: number; weight: number; details: string }
  health: { score: number; weight: number; details: string }
  infrastructure: { score: number; weight: number; details: string }
}

export interface GPSIComparison {
  userResilience: number
  cityAvgResilience: number
  percentile: string // "top 20%", "bottom 30%", etc.
  insight: string
}

// Environmental score (40%) — based on AQI history
function calculateEnvironmentalScore(summary: TrendSummary | null): {
  score: number
  details: string
} {
  if (!summary) {
    return { score: 50, details: 'Insufficient historical data' }
  }

  let score = 0

  // Base score from average PM2.5 (0-50 points)
  if (summary.avgPM25 !== null) {
    if (summary.avgPM25 < 12) score += 50
    else if (summary.avgPM25 < 25) score += 40
    else if (summary.avgPM25 < 35) score += 30
    else if (summary.avgPM25 < 55) score += 20
    else if (summary.avgPM25 < 100) score += 10
    else score += 5
  } else {
    score += 25
  }

  // Trend bonus/penalty (0-30 points)
  if (summary.pm25Trend === 'improving') {
    score += 30
  } else if (summary.pm25Trend === 'stable') {
    score += 15
  } else {
    score += 5
  }

  // Additional 20 points based on sustainability score
  score += Math.round(summary.sustainabilityScore * 0.2)

  const details = summary.avgPM25
    ? `Avg PM2.5: ${summary.avgPM25} µg/m³, Trend: ${summary.pm25Trend} (${summary.pm25ChangePercent > 0 ? '+' : ''}${summary.pm25ChangePercent}%)`
    : 'Limited data available'

  return { score: Math.min(100, score), details }
}

// Health statistics score (30%)
function calculateHealthScore(stats: CityHealthStats | null): {
  score: number
  details: string
} {
  if (!stats) {
    return { score: 50, details: 'City health data not available' }
  }

  let score = 0

  // Respiratory prevalence (lower = better, 0-35 points)
  if (stats.respiratoryPrevalence < 6) score += 35
  else if (stats.respiratoryPrevalence < 8) score += 28
  else if (stats.respiratoryPrevalence < 10) score += 20
  else if (stats.respiratoryPrevalence < 12) score += 12
  else score += 5

  // Mortality rate (lower = better, 0-35 points)
  if (stats.mortalityRate < 35) score += 35
  else if (stats.mortalityRate < 50) score += 28
  else if (stats.mortalityRate < 65) score += 20
  else if (stats.mortalityRate < 80) score += 12
  else score += 5

  // Life expectancy (higher = better, 0-30 points)
  if (stats.lifeExpectancy > 76) score += 30
  else if (stats.lifeExpectancy > 74) score += 24
  else if (stats.lifeExpectancy > 72) score += 18
  else if (stats.lifeExpectancy > 70) score += 12
  else score += 6

  return {
    score: Math.min(100, score),
    details: `Respiratory prevalence: ${stats.respiratoryPrevalence}%, Life expectancy: ${stats.lifeExpectancy} yrs`,
  }
}

// Infrastructure score (30%)
function calculateInfrastructureScore(stats: CityHealthStats | null): {
  score: number
  details: string
} {
  if (!stats) {
    return { score: 50, details: 'City infrastructure data not available' }
  }

  let score = 0

  // Green cover (0-30 points)
  if (stats.greenCoverPercent > 25) score += 30
  else if (stats.greenCoverPercent > 20) score += 24
  else if (stats.greenCoverPercent > 15) score += 18
  else if (stats.greenCoverPercent > 10) score += 12
  else score += 6

  // Healthcare density (0-25 points)
  if (stats.healthcareDensity > 45) score += 25
  else if (stats.healthcareDensity > 35) score += 20
  else if (stats.healthcareDensity > 25) score += 14
  else score += 8

  // Public transport (0-25 points)
  score += Math.round(stats.publicTransportScore * 0.25)

  // Industrial density penalty (0-20 points, lower industrial = higher score)
  score += Math.round((100 - stats.industrialDensity) * 0.2)

  return {
    score: Math.min(100, score),
    details: `Green cover: ${stats.greenCoverPercent}%, Healthcare: ${stats.healthcareDensity}/100k, Transport: ${stats.publicTransportScore}/100`,
  }
}

// Generate personalized comparison
function generateComparison(
  userResilience: number,
  gpsiScore: number,
  stats: CityHealthStats | null
): GPSIComparison {
  // Estimate city average resilience from health stats
  const cityAvgResilience = stats
    ? Math.round(50 + (stats.lifeExpectancy - 70) * 3 - stats.respiratoryPrevalence * 1.5)
    : 50

  const diff = userResilience - cityAvgResilience
  let percentile: string
  let insight: string

  if (diff > 20) {
    percentile = 'top 10%'
    insight = `Your resilience score is significantly above the estimated city average. Despite local pollution conditions, your health profile places you among the most resilient residents.`
  } else if (diff > 10) {
    percentile = 'top 25%'
    insight = `You are more resilient than most residents in this city. Your health and lifestyle choices are protecting you well.`
  } else if (diff > -5) {
    percentile = 'average'
    insight = `Your resilience is close to the city average. Consider improving fitness and reducing exposure for better outcomes.`
  } else if (diff > -15) {
    percentile = 'bottom 35%'
    insight = `Your resilience is below the city average. Your health conditions make you more vulnerable — take extra precautions.`
  } else {
    percentile = 'bottom 15%'
    insight = `Your health profile indicates significantly higher vulnerability than most residents. Prioritize staying indoors during high AQI days and consult your doctor.`
  }

  return {
    userResilience,
    cityAvgResilience: Math.max(0, Math.min(100, cityAvgResilience)),
    percentile,
    insight,
  }
}

export function calculateGPSI(
  city: string,
  historicalSummary: TrendSummary | null,
  userResilience?: number
): GPSIResult {
  const stats = getCityHealthData(city)

  const environmental = calculateEnvironmentalScore(historicalSummary)
  const health = calculateHealthScore(stats)
  const infrastructure = calculateInfrastructureScore(stats)

  const score = Math.round(
    environmental.score * 0.4 +
    health.score * 0.3 +
    infrastructure.score * 0.3
  )

  const comparison = userResilience !== undefined
    ? generateComparison(userResilience, score, stats)
    : null

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown: {
      environmental: { score: environmental.score, weight: 0.4, details: environmental.details },
      health: { score: health.score, weight: 0.3, details: health.details },
      infrastructure: { score: infrastructure.score, weight: 0.3, details: infrastructure.details },
    },
    cityStats: stats,
    comparison,
  }
}
