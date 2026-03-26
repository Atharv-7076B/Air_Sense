// AI Client for Hugging Face Inference API
// Uses Mistral model for personalized recommendations

import type { ExposureResult } from './exposure-calculator'
import type { AQIData } from './aqi-client'

export interface AIRecommendation {
  id: string
  category: 'air_purifier' | 'lifestyle' | 'health' | 'activity' | 'home'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  actionable: boolean
  product?: {
    name: string
    type: string
    specs: string
    priceRange: string
    reason: string
  }
}

export interface AIAnalysis {
  summary: string
  riskAssessment: string
  recommendations: AIRecommendation[]
  airPurifierNeeded: boolean
  urgency: 'immediate' | 'soon' | 'optional'
}

// Air purifier database for recommendations
const AIR_PURIFIERS = [
  {
    name: 'Dyson Purifier Cool TP07',
    type: 'HEPA + Activated Carbon',
    cadr: '290 m³/h',
    coverage: '400 sq ft',
    specs: 'HEPA H13, Captures 99.97% of particles 0.3 microns',
    priceRange: '₹40,000 - ₹50,000',
    idealFor: 'Large rooms, high pollution areas',
    minAQI: 150,
  },
  {
    name: 'Xiaomi Smart Air Purifier 4',
    type: 'HEPA + Activated Carbon',
    cadr: '400 m³/h',
    coverage: '500 sq ft',
    specs: 'True HEPA, PM2.5 display, App control',
    priceRange: '₹12,000 - ₹15,000',
    idealFor: 'Best value, smart features',
    minAQI: 100,
  },
  {
    name: 'Philips AC1217/20',
    type: 'HEPA + NanoProtect',
    cadr: '270 m³/h',
    coverage: '350 sq ft',
    specs: 'VitaShield IPS, Real-time AQI display',
    priceRange: '₹10,000 - ₹13,000',
    idealFor: 'Medium rooms, allergies',
    minAQI: 80,
  },
  {
    name: 'Coway Airmega 150',
    type: 'HEPA + Deodorization',
    cadr: '220 m³/h',
    coverage: '280 sq ft',
    specs: 'Green True HEPA, Air quality indicator',
    priceRange: '₹8,000 - ₹10,000',
    idealFor: 'Small rooms, bedrooms',
    minAQI: 60,
  },
  {
    name: 'MI Air Purifier 3C',
    type: 'True HEPA',
    cadr: '320 m³/h',
    coverage: '400 sq ft',
    specs: 'True HEPA H13, Touch display',
    priceRange: '₹7,000 - ₹9,000',
    idealFor: 'Budget-friendly, apartments',
    minAQI: 50,
  },
]

// Generate AI recommendations based on exposure data
export function generateRecommendations(
  exposure: ExposureResult,
  aqiData: AQIData,
  userContext: {
    city: string
    hasAC: boolean
    homeType: string
  }
): AIAnalysis {
  const recommendations: AIRecommendation[] = []
  let airPurifierNeeded = false
  let urgency: 'immediate' | 'soon' | 'optional' = 'optional'

  const { personalScore, riskCategory, indoorPercent, avgActivityLevel } = exposure
  const { aqi } = aqiData
  const { city, hasAC } = userContext

  // Determine overall risk
  let summary = ''
  let riskAssessment = ''

  if (riskCategory === 'low') {
    summary = `Your air quality exposure is within healthy limits. Your indoor habits are protecting you well from the ${city} AQI of ${aqi}.`
    riskAssessment = 'Your current lifestyle effectively minimizes pollution exposure. Continue maintaining high indoor time and moderate outdoor activities.'
    urgency = 'optional'
  } else if (riskCategory === 'moderate') {
    summary = `Your exposure is moderately elevated at ${personalScore} AQI. While not immediately dangerous, some adjustments could improve your air quality intake.`
    riskAssessment = 'Moderate risk detected. Consider reducing outdoor activities during peak pollution hours and improving indoor air quality.'
    urgency = 'soon'
  } else if (riskCategory === 'high' || riskCategory === 'very_high') {
    summary = `Your personal exposure of ${personalScore} AQI requires immediate attention. The ${city} air quality (${aqi} AQI) combined with your activity patterns is putting you at risk.`
    riskAssessment = 'High risk detected. Immediate action recommended to reduce pollution exposure and protect your respiratory health.'
    urgency = 'immediate'
    airPurifierNeeded = true
  }

  // Air purifier recommendation
  if (aqi > 100 || personalScore > 80) {
    airPurifierNeeded = true
    
    // Select appropriate air purifier
    const suitablePurifiers = AIR_PURIFIERS.filter(p => aqi >= p.minAQI).slice(0, 2)
    
    if (suitablePurifiers.length > 0) {
      const recommended = suitablePurifiers[0]
      recommendations.push({
        id: 'air-purifier-1',
        category: 'air_purifier',
        title: 'Recommended Air Purifier',
        description: `Based on your city's AQI of ${aqi} and your ${Math.round(indoorPercent)}% indoor time, an air purifier would significantly reduce your exposure.`,
        priority: aqi > 150 ? 'high' : 'medium',
        actionable: true,
        product: {
          name: recommended.name,
          type: recommended.type,
          specs: `${recommended.specs}. Coverage: ${recommended.coverage}, CADR: ${recommended.cadr}`,
          priceRange: recommended.priceRange,
          reason: recommended.idealFor,
        },
      })

      if (suitablePurifiers[1]) {
        const alternative = suitablePurifiers[1]
        recommendations.push({
          id: 'air-purifier-2',
          category: 'air_purifier',
          title: 'Budget Alternative',
          description: 'A more affordable option that still provides good protection.',
          priority: 'medium',
          actionable: true,
          product: {
            name: alternative.name,
            type: alternative.type,
            specs: `${alternative.specs}. Coverage: ${alternative.coverage}`,
            priceRange: alternative.priceRange,
            reason: alternative.idealFor,
          },
        })
      }
    }
  } else {
    recommendations.push({
      id: 'no-purifier',
      category: 'air_purifier',
      title: 'Air Purifier Not Required',
      description: `With current AQI at ${aqi} and your ${Math.round(indoorPercent)}% indoor time, an air purifier is optional. Your AC${hasAC ? ' is already' : ' would be'} filtering most pollutants.`,
      priority: 'low',
      actionable: false,
    })
  }

  // Lifestyle recommendations based on activity patterns
  if (indoorPercent < 70) {
    recommendations.push({
      id: 'indoor-time',
      category: 'lifestyle',
      title: 'Increase Indoor Time',
      description: `You're spending ${Math.round(100 - indoorPercent)}% of your day outdoors. Try to increase indoor time during peak pollution hours (6-10 AM and 5-8 PM).`,
      priority: aqi > 100 ? 'high' : 'medium',
      actionable: true,
    })
  }

  if (avgActivityLevel > 2.0) {
    recommendations.push({
      id: 'activity-level',
      category: 'activity',
      title: 'Modify Outdoor Exercise',
      description: 'Your high activity level increases air intake. Consider indoor workouts or exercising during low pollution times (early morning or late evening).',
      priority: aqi > 150 ? 'high' : 'medium',
      actionable: true,
    })
  }

  // Home improvements
  if (!hasAC && aqi > 100) {
    recommendations.push({
      id: 'ac-recommendation',
      category: 'home',
      title: 'Consider Air Conditioning',
      description: 'AC units with filters can reduce indoor pollution by 30-50%. This would significantly lower your exposure while at home.',
      priority: 'medium',
      actionable: true,
    })
  }

  // Health recommendations
  if (riskCategory === 'high' || riskCategory === 'very_high') {
    recommendations.push({
      id: 'mask-recommendation',
      category: 'health',
      title: 'Use N95 Masks Outdoors',
      description: 'When going outside, wear N95 or N99 masks to filter out PM2.5 particles. This can reduce inhalation of harmful particles by up to 95%.',
      priority: 'high',
      actionable: true,
    })

    recommendations.push({
      id: 'health-checkup',
      category: 'health',
      title: 'Monitor Your Health',
      description: 'High pollution exposure can affect respiratory health. If you experience coughing, shortness of breath, or eye irritation, consult a doctor.',
      priority: 'medium',
      actionable: true,
    })
  }

  // Activity timing recommendations
  recommendations.push({
    id: 'timing',
    category: 'activity',
    title: 'Optimal Activity Times',
    description: `Best times for outdoor activities in ${city}: Early morning (5-7 AM) or late evening (after 8 PM) when pollution levels are typically lower.`,
    priority: 'low',
    actionable: true,
  })

  // Indoor plants recommendation
  if (indoorPercent > 50) {
    recommendations.push({
      id: 'plants',
      category: 'home',
      title: 'Add Air-Purifying Plants',
      description: 'Indoor plants like Snake Plant, Peace Lily, and Spider Plant can help filter some indoor air pollutants naturally.',
      priority: 'low',
      actionable: true,
    })
  }

  return {
    summary,
    riskAssessment,
    recommendations: recommendations.slice(0, 8), // Limit to 8 recommendations
    airPurifierNeeded,
    urgency,
  }
}

// Call Hugging Face API for custom analysis (when API key is available)
export async function callHuggingFaceAPI(
  prompt: string,
  apiKey: string
): Promise<string | null> {
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7,
            top_p: 0.95,
            do_sample: true,
          },
        }),
      }
    )

    if (!response.ok) {
      console.error('Hugging Face API error:', response.status)
      return null
    }

    const result = await response.json()
    return result[0]?.generated_text || null
  } catch (error) {
    console.error('Failed to call Hugging Face API:', error)
    return null
  }
}

// Generate AI prompt for custom analysis
export function generateAIPrompt(
  exposure: ExposureResult,
  aqiData: AQIData,
  userContext: { city: string; hasAC: boolean }
): string {
  return `You are a health advisor specializing in air quality and respiratory health.

Analyze the following user data and provide personalized recommendations:

City: ${userContext.city}
City AQI: ${aqiData.aqi}
Personal Exposure Score: ${exposure.personalScore}
Risk Category: ${exposure.riskCategory}
Indoor Time: ${exposure.indoorPercent}%
Activity Level: ${exposure.avgActivityLevel}x normal
Has AC: ${userContext.hasAC ? 'Yes' : 'No'}

Pollutant Levels:
- PM2.5: ${aqiData.pm25} µg/m³
- PM10: ${aqiData.pm10} µg/m³
- Ozone: ${aqiData.o3} ppb

Based on this data, provide:
1. A brief health risk assessment (2-3 sentences)
2. Top 3 actionable recommendations to reduce exposure
3. Whether an air purifier is needed and why

Keep the response concise and actionable.`
}
