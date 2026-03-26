// Resilience Score Calculator (0-100)
// Measures how well an individual can tolerate and recover from pollution exposure

export interface ResilienceInput {
  // From health profile
  age?: number | null
  smokingStatus?: string | null
  exerciseFrequency?: string | null
  dietQuality?: string | null
  yearsInCurrentCity?: number | null
  healthMultiplier?: number // From health-multiplier.ts (1.0-3.0)

  // From wearable data (optional)
  restingHeartRate?: number | null
  spo2?: number | null
}

export interface ScoreBreakdown {
  factor: string
  weight: number
  score: number
  weightedScore: number
  description: string
}

export interface ResilienceResult {
  score: number // 0-100
  breakdown: ScoreBreakdown[]
  interpretation: string
  level: 'poor' | 'below_average' | 'average' | 'good' | 'excellent'
}

// Health history weight (40%) — inverse of health multiplier
function getHealthHistoryScore(healthMultiplier: number): number {
  // healthMultiplier: 1.0 = no conditions, 3.0 = max vulnerability
  // Invert: higher multiplier → lower resilience
  if (healthMultiplier <= 1.0) return 100
  if (healthMultiplier >= 3.0) return 10
  return Math.round(100 - ((healthMultiplier - 1.0) / 2.0) * 90)
}

// Age factor (15%) — peak at 25-35, declining curve
function getAgeScore(age: number): number {
  if (age >= 25 && age <= 35) return 100
  if (age >= 18 && age < 25) return 85
  if (age >= 35 && age <= 50) return 85
  if (age >= 50 && age <= 65) return 60
  if (age >= 12 && age < 18) return 70
  if (age >= 65 && age <= 75) return 40
  if (age < 12) return 50
  return 25 // 75+
}

// Lifestyle factor (20%) — smoking, exercise, diet
function getLifestyleScore(
  smokingStatus: string,
  exerciseFrequency: string,
  dietQuality: string
): number {
  let score = 0

  // Smoking (40% of lifestyle)
  const smokingScores: Record<string, number> = {
    never: 100,
    former: 60,
    current: 20,
  }
  score += (smokingScores[smokingStatus] ?? 70) * 0.4

  // Exercise (35% of lifestyle)
  const exerciseScores: Record<string, number> = {
    sedentary: 20,
    light: 45,
    moderate: 70,
    active: 90,
    very_active: 100,
  }
  score += (exerciseScores[exerciseFrequency] ?? 50) * 0.35

  // Diet (25% of lifestyle)
  const dietScores: Record<string, number> = {
    poor: 20,
    fair: 45,
    good: 75,
    excellent: 100,
  }
  score += (dietScores[dietQuality] ?? 50) * 0.25

  return Math.round(score)
}

// Acclimatization factor (15%) — years in current city
function getAcclimatizationScore(years: number): number {
  // Logarithmic curve: rapid initial acclimatization, plateaus
  if (years <= 0) return 30
  if (years >= 20) return 100
  return Math.round(30 + 70 * (Math.log(years + 1) / Math.log(21)))
}

// Recovery capacity (10%) — resting HR, SpO2
function getRecoveryScore(restingHR: number | null, spo2: number | null): number {
  let score = 50 // Default if no wearable data

  if (restingHR) {
    // Lower resting HR = better cardiovascular fitness
    if (restingHR < 55) score = 100
    else if (restingHR < 65) score = 85
    else if (restingHR < 75) score = 70
    else if (restingHR < 85) score = 50
    else score = 30
  }

  if (spo2) {
    // SpO2 adjustment
    if (spo2 >= 98) score = Math.max(score, 90)
    else if (spo2 >= 95) score = Math.max(score, 70)
    else if (spo2 >= 92) score = Math.min(score, 50)
    else score = Math.min(score, 30)
  }

  return score
}

function getLevel(score: number): ResilienceResult['level'] {
  if (score >= 80) return 'excellent'
  if (score >= 65) return 'good'
  if (score >= 50) return 'average'
  if (score >= 35) return 'below_average'
  return 'poor'
}

function getInterpretation(score: number, level: string): string {
  switch (level) {
    case 'excellent':
      return 'Your body is well-equipped to handle pollution exposure. Maintain your healthy lifestyle.'
    case 'good':
      return 'You have good resilience against pollution. Some conditions or age factors slightly reduce your tolerance.'
    case 'average':
      return 'Your resilience is moderate. Consider improving fitness and reducing exposure on high AQI days.'
    case 'below_average':
      return 'Your resilience is below average. Take extra precautions during poor air quality and consult a doctor.'
    default:
      return 'Your resilience is low. Prioritize staying indoors during high AQI days and seek medical guidance.'
  }
}

export function calculateResilience(input: ResilienceInput): ResilienceResult {
  const healthScore = getHealthHistoryScore(input.healthMultiplier ?? 1.0)
  const ageScore = input.age ? getAgeScore(input.age) : 70
  const lifestyleScore = getLifestyleScore(
    input.smokingStatus ?? 'never',
    input.exerciseFrequency ?? 'moderate',
    input.dietQuality ?? 'good'
  )
  const acclimatizationScore = getAcclimatizationScore(input.yearsInCurrentCity ?? 3)
  const recoveryScore = getRecoveryScore(
    input.restingHeartRate ?? null,
    input.spo2 ?? null
  )

  const breakdown: ScoreBreakdown[] = [
    {
      factor: 'Health History',
      weight: 0.40,
      score: healthScore,
      weightedScore: Math.round(healthScore * 0.40),
      description: 'Based on respiratory and other conditions',
    },
    {
      factor: 'Age Factor',
      weight: 0.15,
      score: ageScore,
      weightedScore: Math.round(ageScore * 0.15),
      description: input.age ? `Age ${input.age} — ${ageScore >= 80 ? 'optimal' : ageScore >= 60 ? 'moderate' : 'vulnerable'} range` : 'No age provided',
    },
    {
      factor: 'Lifestyle',
      weight: 0.20,
      score: lifestyleScore,
      weightedScore: Math.round(lifestyleScore * 0.20),
      description: 'Smoking, exercise, and diet quality',
    },
    {
      factor: 'Acclimatization',
      weight: 0.15,
      score: acclimatizationScore,
      weightedScore: Math.round(acclimatizationScore * 0.15),
      description: `${input.yearsInCurrentCity ?? 0} years in current city`,
    },
    {
      factor: 'Recovery Capacity',
      weight: 0.10,
      score: recoveryScore,
      weightedScore: Math.round(recoveryScore * 0.10),
      description: input.restingHeartRate ? `Resting HR: ${input.restingHeartRate} bpm` : 'Resting HR: baseline estimate',
    },
  ]

  const totalScore = breakdown.reduce((sum, b) => sum + b.weightedScore, 0)
  const clampedScore = Math.max(0, Math.min(100, totalScore))
  const level = getLevel(clampedScore)

  return {
    score: clampedScore,
    breakdown,
    interpretation: getInterpretation(clampedScore, level),
    level,
  }
}
