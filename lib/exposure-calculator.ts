// Personalized Exposure Calculator
// Calculates exposure based on AQI, activity, indoor time, and location factors

import type { ActivityData, ActivityType, LocationType } from './wearable-simulator'

export interface ExposureInput {
  baseAQI: number
  activities: ActivityData[]
  hasAC: boolean
  homeType: 'apartment' | 'house'
  nearConstruction?: boolean
  nearHighway?: boolean
  healthMultiplier?: number // From health profile vulnerability score (1.0 = normal)
}

export interface ExposureResult {
  personalScore: number
  riskCategory: 'low' | 'moderate' | 'high' | 'very_high'
  indoorPercent: number
  avgActivityLevel: number
  avgHeartRate: number
  totalSteps: number
  breakdown: {
    baseAQI: number
    indoorFactor: number
    activityMultiplier: number
    locationModifier: number
  }
  hourlyExposure: { hour: number; exposure: number }[]
  insights: string[]
}

// Indoor reduction factors based on building type and AC
const INDOOR_FACTORS = {
  apartment_with_ac: 0.35, // AC filters ~65% of pollutants
  apartment_without_ac: 0.70, // Windows closed still blocks ~30%
  house_with_ac: 0.40, // Slightly more leakage than apartment
  house_without_ac: 0.75, // More ventilation in houses
  office_with_ac: 0.30, // Commercial HVAC is better
  gym_indoor: 0.45, // Moderate filtration
  commute_indoor: 0.85, // Car/train with some AC
  outdoor: 1.0, // Full exposure
}

// Activity multipliers based on breathing rate
// Higher activity = more air inhaled = more exposure
const ACTIVITY_MULTIPLIERS: Record<ActivityType, number> = {
  sleeping: 0.5, // Very low breathing rate
  resting: 0.8, // Normal breathing
  working: 1.0, // Baseline
  walking: 1.5, // Moderate increase
  commuting: 1.2, // Slight increase
  running: 3.0, // High breathing rate
  cycling: 2.5, // High breathing rate
}

// Location modifiers for micro-environments
const LOCATION_MODIFIERS: Record<LocationType, number> = {
  home: 1.0, // Baseline
  office: 0.95, // Usually better filtration
  gym: 1.0, // Varies
  outdoor: 1.0, // Depends on area
  commute: 1.3, // Traffic pollution
  other: 1.0,
}

// Additional environmental factors
const ENVIRONMENTAL_FACTORS = {
  nearConstruction: 1.4, // Dust and particulates
  nearHighway: 1.3, // Vehicle emissions
  industrial: 1.5, // Industrial pollution
}

function getIndoorFactor(
  location: LocationType,
  isIndoor: boolean,
  hasAC: boolean,
  homeType: 'apartment' | 'house'
): number {
  if (!isIndoor) return INDOOR_FACTORS.outdoor

  switch (location) {
    case 'home':
      const homeKey = `${homeType}_${hasAC ? 'with_ac' : 'without_ac'}` as keyof typeof INDOOR_FACTORS
      return INDOOR_FACTORS[homeKey]
    case 'office':
      return INDOOR_FACTORS.office_with_ac
    case 'gym':
      return INDOOR_FACTORS.gym_indoor
    case 'commute':
      return INDOOR_FACTORS.commute_indoor
    default:
      return hasAC ? 0.5 : 0.75
  }
}

export function calculateExposure(input: ExposureInput): ExposureResult {
  const { baseAQI, activities, hasAC, homeType, nearConstruction, nearHighway, healthMultiplier = 1.0 } = input

  if (activities.length === 0) {
    return {
      personalScore: baseAQI,
      riskCategory: getRiskCategory(baseAQI),
      indoorPercent: 0,
      avgActivityLevel: 1,
      avgHeartRate: 70,
      totalSteps: 0,
      breakdown: {
        baseAQI,
        indoorFactor: 1,
        activityMultiplier: 1,
        locationModifier: 1,
      },
      hourlyExposure: [],
      insights: ['No activity data available'],
    }
  }

  // Calculate metrics from activities
  let totalIndoorTime = 0
  let totalTime = 0
  let totalActivityMultiplier = 0
  let totalLocationModifier = 0
  let totalHeartRate = 0
  let totalSteps = 0
  let totalWeightedExposure = 0
  
  const hourlyExposure: { hour: number; exposure: number }[] = []
  const hourlyData: Map<number, { exposure: number; duration: number }> = new Map()

  for (const activity of activities) {
    const duration = activity.duration
    totalTime += duration

    if (activity.isIndoor) {
      totalIndoorTime += duration
    }

    // Calculate factors for this activity
    const indoorFactor = getIndoorFactor(
      activity.location,
      activity.isIndoor,
      hasAC,
      homeType
    )
    const activityMult = ACTIVITY_MULTIPLIERS[activity.activityType]
    let locationMod = LOCATION_MODIFIERS[activity.location]

    // Apply environmental factors
    if (nearConstruction && !activity.isIndoor) {
      locationMod *= ENVIRONMENTAL_FACTORS.nearConstruction
    }
    if (nearHighway && activity.location === 'commute') {
      locationMod *= ENVIRONMENTAL_FACTORS.nearHighway
    }

    // Calculate exposure for this activity period
    const periodExposure = baseAQI * indoorFactor * activityMult * locationMod
    totalWeightedExposure += periodExposure * duration

    totalActivityMultiplier += activityMult * duration
    totalLocationModifier += locationMod * duration
    totalHeartRate += (activity.heartRate || 70) * duration
    totalSteps += activity.steps

    // Track hourly exposure
    const hour = new Date(activity.timestamp).getHours()
    const existing = hourlyData.get(hour) || { exposure: 0, duration: 0 }
    hourlyData.set(hour, {
      exposure: existing.exposure + periodExposure * duration,
      duration: existing.duration + duration,
    })
  }

  // Calculate averages
  const indoorPercent = totalTime > 0 ? (totalIndoorTime / totalTime) * 100 : 0
  const avgActivityLevel = totalTime > 0 ? totalActivityMultiplier / totalTime : 1
  const avgLocationModifier = totalTime > 0 ? totalLocationModifier / totalTime : 1
  const avgHeartRate = totalTime > 0 ? totalHeartRate / totalTime : 70
  
  // Calculate average indoor factor
  const avgIndoorFactor = indoorPercent > 0 
    ? (indoorPercent / 100) * getIndoorFactor('home', true, hasAC, homeType) + 
      ((100 - indoorPercent) / 100) * 1.0
    : 1.0

  // Final personal exposure score (adjusted for health vulnerability)
  const rawScore = totalTime > 0
    ? totalWeightedExposure / totalTime
    : baseAQI
  const personalScore = Math.round(rawScore * healthMultiplier)

  // Generate hourly exposure data
  for (const [hour, data] of hourlyData) {
    hourlyExposure.push({
      hour,
      exposure: Math.round(data.exposure / data.duration),
    })
  }
  hourlyExposure.sort((a, b) => a.hour - b.hour)

  // Generate insights
  const insights = generateInsights(
    baseAQI,
    personalScore,
    indoorPercent,
    avgActivityLevel,
    hasAC,
    activities,
    healthMultiplier
  )

  return {
    personalScore,
    riskCategory: getRiskCategory(personalScore),
    indoorPercent: Math.round(indoorPercent),
    avgActivityLevel: Math.round(avgActivityLevel * 100) / 100,
    avgHeartRate: Math.round(avgHeartRate),
    totalSteps,
    breakdown: {
      baseAQI,
      indoorFactor: Math.round(avgIndoorFactor * 100) / 100,
      activityMultiplier: Math.round(avgActivityLevel * 100) / 100,
      locationModifier: Math.round(avgLocationModifier * 100) / 100,
    },
    hourlyExposure,
    insights,
  }
}

function getRiskCategory(score: number): 'low' | 'moderate' | 'high' | 'very_high' {
  if (score <= 30) return 'low'
  if (score <= 60) return 'moderate'
  if (score <= 100) return 'high'
  return 'very_high'
}

function generateInsights(
  baseAQI: number,
  personalScore: number,
  indoorPercent: number,
  avgActivityLevel: number,
  hasAC: boolean,
  activities: ActivityData[],
  healthMultiplier: number = 1.0
): string[] {
  const insights: string[] = []

  // Health vulnerability insight
  if (healthMultiplier > 1.5) {
    insights.push(`Your health profile increases exposure sensitivity by ${Math.round((healthMultiplier - 1) * 100)}%. Take extra precautions on high AQI days.`)
  } else if (healthMultiplier > 1.2) {
    insights.push(`Your health conditions moderately increase pollution sensitivity. Monitor symptoms during poor air quality.`)
  }

  // Compare personal vs city AQI
  const reduction = Math.round(((baseAQI - personalScore) / baseAQI) * 100)
  if (reduction > 0) {
    insights.push(`Your personal exposure is ${reduction}% lower than the city AQI due to indoor time.`)
  } else if (reduction < 0) {
    insights.push(`High activity levels increased your exposure by ${Math.abs(reduction)}% above the city AQI.`)
  }

  // Indoor time insights
  if (indoorPercent >= 80) {
    insights.push('Great job staying indoors! This significantly reduces your pollution exposure.')
  } else if (indoorPercent < 50) {
    insights.push('You spent significant time outdoors. Consider reducing outdoor activity during peak pollution hours.')
  }

  // AC insights
  if (hasAC && indoorPercent > 50) {
    insights.push('Your AC is helping filter indoor air, reducing exposure by up to 65%.')
  } else if (!hasAC && baseAQI > 100) {
    insights.push('Consider using an air purifier or AC with HEPA filter for better indoor air quality.')
  }

  // Activity insights
  const outdoorExercise = activities.filter(
    a => !a.isIndoor && ['running', 'cycling', 'walking'].includes(a.activityType)
  )
  if (outdoorExercise.length > 0 && baseAQI > 100) {
    insights.push('Outdoor exercise during poor air quality increases exposure 2-3x. Consider indoor workouts on high AQI days.')
  }

  // Time-based insights
  const morningActivities = activities.filter(
    a => new Date(a.timestamp).getHours() >= 6 && new Date(a.timestamp).getHours() < 10 && !a.isIndoor
  )
  if (morningActivities.length > 0) {
    insights.push('Morning outdoor activities are generally better as pollution levels are typically lower.')
  }

  return insights.slice(0, 4) // Return max 4 insights
}

// Calculate weekly exposure trend
export function calculateWeeklyTrend(
  dailyData: { date: Date; personalScore: number }[]
): {
  trend: 'improving' | 'stable' | 'worsening'
  changePercent: number
  average: number
} {
  if (dailyData.length < 2) {
    return { trend: 'stable', changePercent: 0, average: dailyData[0]?.personalScore || 0 }
  }

  const scores = dailyData.map(d => d.personalScore)
  const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  
  // Compare first half to second half
  const midpoint = Math.floor(scores.length / 2)
  const firstHalf = scores.slice(0, midpoint)
  const secondHalf = scores.slice(midpoint)
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
  
  const changePercent = Math.round(((secondAvg - firstAvg) / firstAvg) * 100)
  
  let trend: 'improving' | 'stable' | 'worsening'
  if (changePercent <= -10) {
    trend = 'improving'
  } else if (changePercent >= 10) {
    trend = 'worsening'
  } else {
    trend = 'stable'
  }

  return { trend, changePercent, average }
}

// Get risk category details
export function getRiskDetails(category: 'low' | 'moderate' | 'high' | 'very_high'): {
  label: string
  description: string
  recommendations: string[]
  color: string
  bgColor: string
} {
  switch (category) {
    case 'low':
      return {
        label: 'Low Risk',
        description: 'Your exposure is within healthy limits',
        recommendations: [
          'Continue your current habits',
          'Outdoor activities are safe',
          'No immediate action needed',
        ],
        color: 'text-success-foreground',
        bgColor: 'bg-success',
      }
    case 'moderate':
      return {
        label: 'Moderate Risk',
        description: 'Your exposure is moderately elevated',
        recommendations: [
          'Consider reducing outdoor activities',
          'Use masks during high pollution hours',
          'Keep windows closed during peak times',
        ],
        color: 'text-warning-foreground',
        bgColor: 'bg-warning',
      }
    case 'high':
      return {
        label: 'High Risk',
        description: 'Your exposure is significantly elevated',
        recommendations: [
          'Minimize outdoor activities',
          'Use N95 masks when outside',
          'Consider an air purifier for home',
          'Avoid outdoor exercise',
        ],
        color: 'text-danger-foreground',
        bgColor: 'bg-danger',
      }
    case 'very_high':
      return {
        label: 'Very High Risk',
        description: 'Your exposure is at dangerous levels',
        recommendations: [
          'Stay indoors as much as possible',
          'Use air purifiers with HEPA filters',
          'Wear N95 masks if going outside',
          'Consider relocating temporarily',
          'Consult a doctor if experiencing symptoms',
        ],
        color: 'text-danger-foreground',
        bgColor: 'bg-danger',
      }
  }
}
