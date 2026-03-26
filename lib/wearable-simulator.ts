// Wearable Data Simulator
// Generates realistic activity data for Apple Watch and Noise Band

export type ActivityType = 'sleeping' | 'resting' | 'walking' | 'running' | 'cycling' | 'working' | 'commuting'
export type LocationType = 'home' | 'office' | 'gym' | 'outdoor' | 'commute' | 'other'
export type WearableSource = 'apple_watch' | 'noise_band' | 'simulator' | 'fitbit'

export interface ActivityData {
  timestamp: Date
  activityType: ActivityType
  heartRate: number
  steps: number
  calories: number
  isIndoor: boolean
  location: LocationType
  duration: number // in minutes
  source: WearableSource
}

export interface DailyActivitySummary {
  date: Date
  totalSteps: number
  totalCalories: number
  avgHeartRate: number
  activeMinutes: number
  indoorPercent: number
  activities: ActivityData[]
}

// Activity profiles with realistic heart rate and step ranges
const activityProfiles: Record<ActivityType, {
  heartRateRange: [number, number]
  stepsPerMinute: [number, number]
  caloriesPerMinute: [number, number]
  isIndoor: boolean
  locations: LocationType[]
}> = {
  sleeping: {
    heartRateRange: [50, 65],
    stepsPerMinute: [0, 0],
    caloriesPerMinute: [0.8, 1.2],
    isIndoor: true,
    locations: ['home'],
  },
  resting: {
    heartRateRange: [60, 80],
    stepsPerMinute: [0, 5],
    caloriesPerMinute: [1, 1.5],
    isIndoor: true,
    locations: ['home', 'office'],
  },
  walking: {
    heartRateRange: [90, 120],
    stepsPerMinute: [80, 120],
    caloriesPerMinute: [3, 5],
    isIndoor: false,
    locations: ['outdoor', 'commute'],
  },
  running: {
    heartRateRange: [140, 180],
    stepsPerMinute: [150, 200],
    caloriesPerMinute: [10, 15],
    isIndoor: false,
    locations: ['outdoor', 'gym'],
  },
  cycling: {
    heartRateRange: [120, 160],
    stepsPerMinute: [0, 0],
    caloriesPerMinute: [8, 12],
    isIndoor: false,
    locations: ['outdoor', 'gym'],
  },
  working: {
    heartRateRange: [65, 85],
    stepsPerMinute: [2, 10],
    caloriesPerMinute: [1.2, 2],
    isIndoor: true,
    locations: ['office', 'home'],
  },
  commuting: {
    heartRateRange: [70, 95],
    stepsPerMinute: [20, 60],
    caloriesPerMinute: [2, 4],
    isIndoor: false,
    locations: ['commute'],
  },
}

// Daily schedule templates (realistic patterns)
interface ScheduleBlock {
  startHour: number
  endHour: number
  activity: ActivityType
  probability: number // probability of this activity occurring
}

const weekdaySchedule: ScheduleBlock[] = [
  { startHour: 0, endHour: 6, activity: 'sleeping', probability: 0.95 },
  { startHour: 6, endHour: 7, activity: 'resting', probability: 0.7 },
  { startHour: 7, endHour: 8, activity: 'commuting', probability: 0.6 },
  { startHour: 8, endHour: 12, activity: 'working', probability: 0.85 },
  { startHour: 12, endHour: 13, activity: 'walking', probability: 0.5 },
  { startHour: 13, endHour: 17, activity: 'working', probability: 0.85 },
  { startHour: 17, endHour: 18, activity: 'commuting', probability: 0.6 },
  { startHour: 18, endHour: 19, activity: 'running', probability: 0.3 },
  { startHour: 19, endHour: 22, activity: 'resting', probability: 0.7 },
  { startHour: 22, endHour: 24, activity: 'sleeping', probability: 0.9 },
]

const weekendSchedule: ScheduleBlock[] = [
  { startHour: 0, endHour: 8, activity: 'sleeping', probability: 0.95 },
  { startHour: 8, endHour: 10, activity: 'resting', probability: 0.8 },
  { startHour: 10, endHour: 12, activity: 'walking', probability: 0.4 },
  { startHour: 12, endHour: 14, activity: 'resting', probability: 0.6 },
  { startHour: 14, endHour: 16, activity: 'cycling', probability: 0.25 },
  { startHour: 16, endHour: 18, activity: 'walking', probability: 0.4 },
  { startHour: 18, endHour: 22, activity: 'resting', probability: 0.7 },
  { startHour: 22, endHour: 24, activity: 'sleeping', probability: 0.9 },
]

// Seeded PRNG (mulberry32) — same seed produces same sequence
function createSeededRandom(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Seed based on date (YYYY-MM-DD) so same day = same data
function dateSeed(date: Date): number {
  const d = new Date(date)
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

// Module-level seeded random — reset per generation call
let seededRandom = createSeededRandom(dateSeed(new Date()))

// Utility functions
function randomInRange(min: number, max: number): number {
  return Math.floor(seededRandom() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number): number {
  return seededRandom() * (max - min) + min
}

function pickRandom<T>(array: T[]): T {
  return array[Math.floor(seededRandom() * array.length)]
}

// Generate activity data for a specific time block
function generateActivityForBlock(
  date: Date,
  hour: number,
  activity: ActivityType,
  source: WearableSource
): ActivityData {
  const profile = activityProfiles[activity]
  const duration = 60 // 1 hour blocks
  
  const timestamp = new Date(date)
  timestamp.setHours(hour, randomInRange(0, 30), 0, 0)

  return {
    timestamp,
    activityType: activity,
    heartRate: randomInRange(...profile.heartRateRange),
    steps: randomInRange(...profile.stepsPerMinute) * duration,
    calories: Math.round(randomFloat(...profile.caloriesPerMinute) * duration),
    isIndoor: profile.isIndoor,
    location: pickRandom(profile.locations),
    duration,
    source,
  }
}

// Generate a full day of activity data
export function generateDayActivities(
  date: Date,
  source: WearableSource = 'simulator'
): ActivityData[] {
  seededRandom = createSeededRandom(dateSeed(date))
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  const schedule = isWeekend ? weekendSchedule : weekdaySchedule
  const activities: ActivityData[] = []

  for (const block of schedule) {
    // Check if activity occurs based on probability
    if (Math.random() > block.probability) {
      // Fall back to resting if activity doesn't occur
      for (let hour = block.startHour; hour < block.endHour; hour++) {
        activities.push(generateActivityForBlock(date, hour, 'resting', source))
      }
    } else {
      for (let hour = block.startHour; hour < block.endHour; hour++) {
        activities.push(generateActivityForBlock(date, hour, block.activity, source))
      }
    }
  }

  return activities.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

// Generate summary for a day
export function generateDailySummary(
  date: Date,
  activities?: ActivityData[]
): DailyActivitySummary {
  const dayActivities = activities || generateDayActivities(date)
  
  const totalSteps = dayActivities.reduce((sum, a) => sum + a.steps, 0)
  const totalCalories = dayActivities.reduce((sum, a) => sum + a.calories, 0)
  const avgHeartRate = Math.round(
    dayActivities.reduce((sum, a) => sum + a.heartRate, 0) / dayActivities.length
  )
  const activeMinutes = dayActivities
    .filter(a => !['sleeping', 'resting'].includes(a.activityType))
    .reduce((sum, a) => sum + a.duration, 0)
  
  const indoorTime = dayActivities.filter(a => a.isIndoor).reduce((sum, a) => sum + a.duration, 0)
  const totalTime = dayActivities.reduce((sum, a) => sum + a.duration, 0)
  const indoorPercent = totalTime > 0 ? (indoorTime / totalTime) * 100 : 0

  return {
    date,
    totalSteps,
    totalCalories,
    avgHeartRate,
    activeMinutes,
    indoorPercent,
    activities: dayActivities,
  }
}

// Generate multiple days of data
export function generateWeeklyData(
  startDate: Date = new Date(),
  source: WearableSource = 'simulator'
): DailyActivitySummary[] {
  const summaries: DailyActivitySummary[] = []
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(startDate)
    date.setDate(date.getDate() - i)
    const activities = generateDayActivities(date, source)
    summaries.push(generateDailySummary(date, activities))
  }

  return summaries
}

// Apple Watch specific data format
export interface AppleWatchData {
  deviceId: string
  deviceName: string
  lastSync: Date
  batteryLevel: number
  healthMetrics: {
    heartRate: number
    restingHeartRate: number
    heartRateVariability: number
    respiratoryRate: number
    bloodOxygen: number
    bodyTemperature: number
  }
  activityRings: {
    moveCalories: number
    moveGoal: number
    exerciseMinutes: number
    exerciseGoal: number
    standHours: number
    standGoal: number
  }
  workouts: ActivityData[]
}

export function generateAppleWatchData(): AppleWatchData {
  const today = new Date()
  seededRandom = createSeededRandom(dateSeed(today) + 1)
  const activities = generateDayActivities(today, 'apple_watch')
  const summary = generateDailySummary(today, activities)

  return {
    deviceId: 'AW-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    deviceName: 'Apple Watch Series 9',
    lastSync: new Date(),
    batteryLevel: randomInRange(20, 100),
    healthMetrics: {
      heartRate: summary.avgHeartRate,
      restingHeartRate: randomInRange(55, 70),
      heartRateVariability: randomInRange(25, 60),
      respiratoryRate: randomFloat(12, 18),
      bloodOxygen: randomFloat(95, 100),
      bodyTemperature: randomFloat(36.1, 37.0),
    },
    activityRings: {
      moveCalories: summary.totalCalories,
      moveGoal: 500,
      exerciseMinutes: summary.activeMinutes,
      exerciseGoal: 30,
      standHours: randomInRange(8, 14),
      standGoal: 12,
    },
    workouts: activities.filter(a => 
      ['walking', 'running', 'cycling'].includes(a.activityType)
    ),
  }
}

// Noise Band specific data format
export interface NoiseBandData {
  deviceId: string
  deviceName: string
  lastSync: Date
  batteryLevel: number
  healthMetrics: {
    heartRate: number
    spo2: number
    stressLevel: number
    sleepScore: number
  }
  dailyStats: {
    steps: number
    distance: number // in km
    calories: number
    activeMinutes: number
  }
  sleepData: {
    totalSleep: number // in hours
    deepSleep: number
    lightSleep: number
    remSleep: number
    awakeTime: number
  }
}

export function generateNoiseBandData(): NoiseBandData {
  const today = new Date()
  seededRandom = createSeededRandom(dateSeed(today) + 2)
  const activities = generateDayActivities(today, 'noise_band')
  const summary = generateDailySummary(today, activities)

  return {
    deviceId: 'NB-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    deviceName: 'Noise ColorFit Pro 4',
    lastSync: new Date(),
    batteryLevel: randomInRange(30, 100),
    healthMetrics: {
      heartRate: summary.avgHeartRate,
      spo2: randomFloat(95, 99),
      stressLevel: randomInRange(20, 60),
      sleepScore: randomInRange(70, 95),
    },
    dailyStats: {
      steps: summary.totalSteps,
      distance: parseFloat((summary.totalSteps * 0.0008).toFixed(2)), // ~0.8m per step
      calories: summary.totalCalories,
      activeMinutes: summary.activeMinutes,
    },
    sleepData: {
      totalSleep: randomFloat(6, 8),
      deepSleep: randomFloat(1, 2.5),
      lightSleep: randomFloat(3, 4),
      remSleep: randomFloat(1, 2),
      awakeTime: randomFloat(0.2, 0.8),
    },
  }
}
