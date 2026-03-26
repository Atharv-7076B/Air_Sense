// Fitness Score Calculator (0-100)
// Measures current physical fitness relevant to pollution exposure

export interface FitnessInput {
  // From health profile
  bmi?: number | null

  // From wearable data (or self-reported)
  restingHeartRate?: number | null  // bpm
  heartRateRecovery?: number | null // bpm drop in 1 min after exercise
  avgDailySteps?: number | null
  activeMinutesPerWeek?: number | null
  spo2?: number | null // blood oxygen %
  sleepHours?: number | null
  sleepScore?: number | null // 0-100 from wearable
}

export interface FitnessBreakdown {
  factor: string
  weight: number
  score: number
  weightedScore: number
  description: string
}

export interface FitnessResult {
  score: number // 0-100
  breakdown: FitnessBreakdown[]
  interpretation: string
  level: 'poor' | 'below_average' | 'average' | 'good' | 'excellent'
}

// Cardiovascular fitness (30%) — resting HR, HR recovery
function getCardiovascularScore(restingHR: number | null, hrRecovery: number | null): number {
  let hrScore = 50
  if (restingHR) {
    if (restingHR < 50) hrScore = 100 // Athletic
    else if (restingHR < 60) hrScore = 90
    else if (restingHR < 70) hrScore = 75
    else if (restingHR < 80) hrScore = 55
    else if (restingHR < 90) hrScore = 35
    else hrScore = 20
  }

  let recoveryScore = 50
  if (hrRecovery) {
    // HR recovery: drop in bpm after 1 min of rest post-exercise
    if (hrRecovery > 40) recoveryScore = 100
    else if (hrRecovery > 30) recoveryScore = 85
    else if (hrRecovery > 20) recoveryScore = 65
    else if (hrRecovery > 12) recoveryScore = 45
    else recoveryScore = 25
  }

  // Weight HR more if recovery not available
  return hrRecovery ? Math.round(hrScore * 0.6 + recoveryScore * 0.4) : hrScore
}

// Activity level (25%) — daily steps, active minutes
function getActivityScore(steps: number | null, activeMinutes: number | null): number {
  let stepsScore = 50
  if (steps) {
    if (steps >= 12000) stepsScore = 100
    else if (steps >= 10000) stepsScore = 85
    else if (steps >= 7500) stepsScore = 70
    else if (steps >= 5000) stepsScore = 50
    else if (steps >= 3000) stepsScore = 35
    else stepsScore = 20
  }

  let activeScore = 50
  if (activeMinutes) {
    // WHO recommends 150 min/week moderate or 75 min/week vigorous
    if (activeMinutes >= 300) activeScore = 100
    else if (activeMinutes >= 200) activeScore = 85
    else if (activeMinutes >= 150) activeScore = 70
    else if (activeMinutes >= 75) activeScore = 50
    else if (activeMinutes >= 30) activeScore = 30
    else activeScore = 15
  }

  return Math.round(stepsScore * 0.5 + activeScore * 0.5)
}

// BMI factor (15%)
function getBMIScore(bmi: number | null): number {
  if (!bmi) return 50
  // Normal BMI (18.5-24.9) = highest score
  if (bmi >= 18.5 && bmi <= 24.9) return 100
  if (bmi >= 25 && bmi <= 27) return 80
  if (bmi >= 17 && bmi < 18.5) return 70
  if (bmi >= 27 && bmi <= 30) return 60
  if (bmi >= 30 && bmi <= 35) return 40
  if (bmi >= 15 && bmi < 17) return 40
  return 20
}

// SpO2 levels (15%)
function getSpO2Score(spo2: number | null): number {
  if (!spo2) return 50
  if (spo2 >= 98) return 100
  if (spo2 >= 96) return 85
  if (spo2 >= 95) return 70
  if (spo2 >= 93) return 50
  if (spo2 >= 90) return 30
  return 15
}

// Sleep quality (15%)
function getSleepScore(sleepHours: number | null, sleepScore: number | null): number {
  // Prefer wearable sleep score if available
  if (sleepScore) {
    return Math.min(100, sleepScore)
  }

  if (!sleepHours) return 50

  // Optimal: 7-9 hours
  if (sleepHours >= 7 && sleepHours <= 9) return 100
  if (sleepHours >= 6 && sleepHours < 7) return 70
  if (sleepHours > 9 && sleepHours <= 10) return 80
  if (sleepHours >= 5 && sleepHours < 6) return 45
  if (sleepHours > 10) return 50
  return 25 // Less than 5 hours
}

function getLevel(score: number): FitnessResult['level'] {
  if (score >= 80) return 'excellent'
  if (score >= 65) return 'good'
  if (score >= 50) return 'average'
  if (score >= 35) return 'below_average'
  return 'poor'
}

function getInterpretation(score: number, level: string): string {
  switch (level) {
    case 'excellent':
      return 'Excellent physical fitness. Your body is well-prepared to handle pollution exposure with strong cardiovascular and recovery capacity.'
    case 'good':
      return 'Good fitness level. You have above-average capacity to handle environmental stressors.'
    case 'average':
      return 'Average fitness. Consider increasing activity levels and improving sleep for better pollution resilience.'
    case 'below_average':
      return 'Below-average fitness. Improving cardiovascular health and activity levels would help your body better cope with pollution.'
    default:
      return 'Low fitness level. Focus on gradual exercise increase, better sleep, and consult a doctor about improving overall health.'
  }
}

export function calculateFitness(input: FitnessInput): FitnessResult {
  const cardioScore = getCardiovascularScore(input.restingHeartRate ?? null, input.heartRateRecovery ?? null)
  const activityScore = getActivityScore(input.avgDailySteps ?? null, input.activeMinutesPerWeek ?? null)
  const bmiScore = getBMIScore(input.bmi ?? null)
  const spo2Score = getSpO2Score(input.spo2 ?? null)
  const sleepScoreVal = getSleepScore(input.sleepHours ?? null, input.sleepScore ?? null)

  const breakdown: FitnessBreakdown[] = [
    {
      factor: 'Cardiovascular',
      weight: 0.30,
      score: cardioScore,
      weightedScore: Math.round(cardioScore * 0.30),
      description: input.restingHeartRate ? `Resting HR: ${input.restingHeartRate} bpm` : 'Resting HR: baseline estimate',
    },
    {
      factor: 'Activity Level',
      weight: 0.25,
      score: activityScore,
      weightedScore: Math.round(activityScore * 0.25),
      description: input.avgDailySteps ? `${input.avgDailySteps.toLocaleString()} avg daily steps` : 'Activity level: baseline estimate',
    },
    {
      factor: 'BMI',
      weight: 0.15,
      score: bmiScore,
      weightedScore: Math.round(bmiScore * 0.15),
      description: input.bmi ? `BMI: ${input.bmi}` : 'BMI not provided',
    },
    {
      factor: 'Blood Oxygen',
      weight: 0.15,
      score: spo2Score,
      weightedScore: Math.round(spo2Score * 0.15),
      description: input.spo2 ? `SpO2: ${input.spo2}%` : 'SpO2 not available',
    },
    {
      factor: 'Sleep Quality',
      weight: 0.15,
      score: sleepScoreVal,
      weightedScore: Math.round(sleepScoreVal * 0.15),
      description: input.sleepHours ? `${input.sleepHours} hrs/night` : 'Sleep data not available',
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
