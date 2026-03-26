// Health Vulnerability Multiplier Calculator
// Based on EPA/WHO exposure guidelines for pollution sensitivity
// Returns a vulnerability score where 1.0 = normal, higher = more vulnerable

export interface HealthProfile {
  age?: number | null
  gender?: string | null
  weight?: number | null
  height?: number | null
  bmi?: number | null
  smokingStatus: string // never, former, current

  // Respiratory conditions
  asthma: boolean
  asthmaSeverity?: string | null
  copd: boolean
  copdSeverity?: string | null
  bronchitis: boolean
  bronchitisSeverity?: string | null
  pneumonia: boolean
  pneumoniaSeverity?: string | null
  tuberculosis: boolean
  tuberculosisSeverity?: string | null
  allergicRhinitis: boolean
  allergicRhinitisSeverity?: string | null
  sinusitis: boolean
  sinusitisSeverity?: string | null

  // Other conditions
  cardiovascularDisease: boolean
  cardiovascularSeverity?: string | null
  diabetes: boolean
  diabetesSeverity?: string | null
  immunocompromised: boolean
  pregnancy: boolean

  // Family history
  familyRespiratoryHistory: boolean
}

export interface HealthVulnerability {
  score: number // 1.0 = normal, higher = more vulnerable
  factors: string[]
  riskLevel: 'low' | 'medium' | 'high'
}

// Severity multiplier lookup
const SEVERITY_MULTIPLIERS: Record<string, Record<string, number>> = {
  asthma: { mild: 1.3, moderate: 1.6, severe: 2.0 },
  copd: { mild: 1.5, moderate: 2.0, severe: 2.5 },
  bronchitis: { mild: 1.3, moderate: 1.5, severe: 1.8 },
  pneumonia: { mild: 1.2, moderate: 1.35, severe: 1.5 },
  tuberculosis: { mild: 1.3, moderate: 1.5, severe: 1.8 },
  allergicRhinitis: { mild: 1.1, moderate: 1.25, severe: 1.4 },
  sinusitis: { mild: 1.1, moderate: 1.2, severe: 1.3 },
  cardiovascularDisease: { mild: 1.4, moderate: 1.6, severe: 1.8 },
  diabetes: { mild: 1.1, moderate: 1.2, severe: 1.3 },
}

// Smoking multipliers
const SMOKING_MULTIPLIERS: Record<string, number> = {
  never: 1.0,
  former: 1.2,
  current: 1.5,
}

// Age vulnerability curve
function getAgeMultiplier(age: number): { multiplier: number; label: string } {
  if (age < 5) return { multiplier: 1.5, label: 'Very young age (under 5)' }
  if (age < 12) return { multiplier: 1.3, label: 'Young age (5-11)' }
  if (age < 18) return { multiplier: 1.2, label: 'Adolescent age (12-17)' }
  if (age <= 35) return { multiplier: 1.0, label: '' } // Peak resilience
  if (age <= 50) return { multiplier: 1.0, label: '' }
  if (age <= 65) return { multiplier: 1.2, label: 'Age factor (50-65)' }
  if (age <= 75) return { multiplier: 1.4, label: 'Elderly age (65-75)' }
  return { multiplier: 1.6, label: 'Advanced age (75+)' }
}

function getConditionMultiplier(
  hasCondition: boolean,
  severity: string | null | undefined,
  conditionKey: string,
  conditionLabel: string
): { multiplier: number; factor: string | null } {
  if (!hasCondition) return { multiplier: 1.0, factor: null }

  const severityLevel = severity || 'moderate'
  const mult = SEVERITY_MULTIPLIERS[conditionKey]?.[severityLevel] ?? 1.3

  return {
    multiplier: mult,
    factor: `${conditionLabel} (${severityLevel}): ${mult}x`,
  }
}

export function calculateHealthMultiplier(profile: HealthProfile): HealthVulnerability {
  const factors: string[] = []
  let combinedMultiplier = 1.0

  // 1. Age factor
  if (profile.age) {
    const ageFactor = getAgeMultiplier(profile.age)
    if (ageFactor.multiplier > 1.0) {
      // Use additive approach for age (not multiplicative)
      combinedMultiplier += ageFactor.multiplier - 1.0
      factors.push(`${ageFactor.label}: ${ageFactor.multiplier}x`)
    }
  }

  // 2. Smoking factor
  const smokingMult = SMOKING_MULTIPLIERS[profile.smokingStatus] ?? 1.0
  if (smokingMult > 1.0) {
    combinedMultiplier += smokingMult - 1.0
    factors.push(`Smoking (${profile.smokingStatus}): ${smokingMult}x`)
  }

  // 3. Respiratory conditions (these compound — use multiplicative for the worst ones)
  const respiratoryConditions = [
    getConditionMultiplier(profile.asthma, profile.asthmaSeverity, 'asthma', 'Asthma'),
    getConditionMultiplier(profile.copd, profile.copdSeverity, 'copd', 'COPD'),
    getConditionMultiplier(profile.bronchitis, profile.bronchitisSeverity, 'bronchitis', 'Bronchitis'),
    getConditionMultiplier(profile.pneumonia, profile.pneumoniaSeverity, 'pneumonia', 'Pneumonia history'),
    getConditionMultiplier(profile.tuberculosis, profile.tuberculosisSeverity, 'tuberculosis', 'Tuberculosis'),
    getConditionMultiplier(profile.allergicRhinitis, profile.allergicRhinitisSeverity, 'allergicRhinitis', 'Allergic Rhinitis'),
    getConditionMultiplier(profile.sinusitis, profile.sinusitisSeverity, 'sinusitis', 'Sinusitis'),
  ].filter(c => c.factor !== null)

  // Apply the highest respiratory multiplier multiplicatively, rest additively
  if (respiratoryConditions.length > 0) {
    // Sort by multiplier descending
    respiratoryConditions.sort((a, b) => b.multiplier - a.multiplier)

    // Highest condition: multiplicative
    const primary = respiratoryConditions[0]
    combinedMultiplier *= primary.multiplier
    factors.push(primary.factor!)

    // Additional respiratory conditions: additive (diminishing)
    for (let i = 1; i < respiratoryConditions.length; i++) {
      const additional = respiratoryConditions[i]
      combinedMultiplier += (additional.multiplier - 1.0) * 0.5 // half weight for secondary
      factors.push(additional.factor!)
    }
  }

  // 4. Other conditions (additive)
  const otherConditions = [
    getConditionMultiplier(profile.cardiovascularDisease, profile.cardiovascularSeverity, 'cardiovascularDisease', 'Cardiovascular disease'),
    getConditionMultiplier(profile.diabetes, profile.diabetesSeverity, 'diabetes', 'Diabetes'),
  ].filter(c => c.factor !== null)

  for (const condition of otherConditions) {
    combinedMultiplier += (condition.multiplier - 1.0) * 0.7
    factors.push(condition.factor!)
  }

  // 5. Immunocompromised
  if (profile.immunocompromised) {
    combinedMultiplier += 0.5
    factors.push('Immunocompromised: +0.5')
  }

  // 6. Pregnancy
  if (profile.pregnancy) {
    combinedMultiplier += 0.3
    factors.push('Pregnancy: +0.3')
  }

  // 7. Family history (small additive factor)
  if (profile.familyRespiratoryHistory) {
    combinedMultiplier += 0.1
    factors.push('Family respiratory history: +0.1')
  }

  // Cap at 3.0x to prevent unrealistic scores
  const finalScore = Math.min(combinedMultiplier, 3.0)
  const roundedScore = Math.round(finalScore * 100) / 100

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high'
  if (roundedScore <= 1.2) {
    riskLevel = 'low'
  } else if (roundedScore <= 1.8) {
    riskLevel = 'medium'
  } else {
    riskLevel = 'high'
  }

  return {
    score: roundedScore,
    factors,
    riskLevel,
  }
}

// Calculate BMI from weight (kg) and height (cm)
export function calculateBMI(weight: number, height: number): number {
  const heightInMeters = height / 100
  return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10
}

// Get BMI category
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25) return 'Normal'
  if (bmi < 30) return 'Overweight'
  return 'Obese'
}
