// Fuzzy Logic Recommendation Client
// Calls the Python analytics service for fuzzy inference

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8000'

export interface FuzzyInputs {
  aqi: number
  exposureScore: number
  healthVulnerability: number // 1.0-3.0
  fitnessLevel: number // 0-100
  timeOfDay: number // 0-24
  activityType: number // 0=sedentary, 1=light, 2=moderate, 3=vigorous
  forecastTrend: number // -10 to 10 (-=improving, +=worsening)
}

export interface FuzzyRecommendations {
  outdoorSafety: { value: number; label: string }
  mask: { value: number; label: string; type: string | null }
  purifier: { value: number; label: string }
  exercise: { value: number; label: string }
  ventilation: { value: number; label: string }
  medicalAlert: { value: number; label: string }
  reasoning: string[]
}

export async function getRecommendations(inputs: FuzzyInputs): Promise<FuzzyRecommendations> {
  const response = await fetch(`${ANALYTICS_SERVICE_URL}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aqi: inputs.aqi,
      exposure_score: inputs.exposureScore,
      health_vulnerability: inputs.healthVulnerability,
      fitness_level: inputs.fitnessLevel,
      time_of_day: inputs.timeOfDay,
      activity_type: inputs.activityType,
      forecast_trend: inputs.forecastTrend,
    }),
    signal: AbortSignal.timeout(10000),
  })

  const text = await response.text()
  if (!text) {
    throw new Error('Fuzzy service returned empty response')
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Fuzzy service returned invalid JSON')
  }

  if (!response.ok) {
    const detail = Array.isArray(data.detail) ? JSON.stringify(data.detail) : (data.detail || response.statusText)
    throw new Error(`Fuzzy service error: ${detail}`)
  }

  return {
    outdoorSafety: { value: data.outdoor_safety, label: data.outdoor_safety_label },
    mask: { value: data.mask_recommendation, label: data.mask_label, type: data.mask_type },
    purifier: { value: data.purifier_urgency, label: data.purifier_label },
    exercise: { value: data.exercise_modification, label: data.exercise_label },
    ventilation: { value: data.ventilation_advice, label: data.ventilation_label },
    medicalAlert: { value: data.medical_alert, label: data.medical_label },
    reasoning: data.reasoning,
  }
}
