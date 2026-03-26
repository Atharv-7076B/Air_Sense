// Transform Fitbit API responses into app's ActivityData format
// This allows the exposure calculator to work with real Fitbit data

import type { ActivityData, ActivityType, LocationType } from './wearable-simulator'
import type {
  FitbitActivityResponse,
  FitbitHeartRateResponse,
  FitbitSleepResponse,
  FitbitSpO2Response,
  FitbitBreathingRateResponse,
  FitbitProfileResponse,
} from './fitbit-client'

// Map Fitbit activity names to our activity types
const FITBIT_ACTIVITY_MAP: Record<string, ActivityType> = {
  'Walk': 'walking',
  'Walking': 'walking',
  'Run': 'running',
  'Running': 'running',
  'Outdoor Run': 'running',
  'Treadmill': 'running',
  'Bike': 'cycling',
  'Cycling': 'cycling',
  'Outdoor Bike': 'cycling',
  'Spinning': 'cycling',
  'Sport': 'running',
  'Workout': 'running',
  'Weights': 'working',
  'Yoga': 'resting',
  'Swim': 'running',
  'Hike': 'walking',
  'Hiking': 'walking',
  'Elliptical': 'running',
  'Stairclimber': 'walking',
  'Tennis': 'running',
  'Basketball': 'running',
  'Soccer': 'running',
  'Football': 'running',
  'Dance': 'walking',
  'Aerobic Workout': 'running',
  'Pilates': 'resting',
  'Meditation': 'resting',
}

function mapFitbitActivity(name: string): ActivityType {
  // Check exact match first
  if (FITBIT_ACTIVITY_MAP[name]) return FITBIT_ACTIVITY_MAP[name]

  // Check partial match
  const lowerName = name.toLowerCase()
  for (const [key, value] of Object.entries(FITBIT_ACTIVITY_MAP)) {
    if (lowerName.includes(key.toLowerCase())) return value
  }

  // Default to walking for unknown activities
  return 'walking'
}

// Determine if an activity is indoor based on name
function isActivityIndoor(name: string): boolean {
  const indoorKeywords = ['treadmill', 'indoor', 'gym', 'weights', 'yoga', 'pilates', 'spinning', 'elliptical', 'stairclimber', 'meditation', 'swim']
  const lowerName = name.toLowerCase()
  return indoorKeywords.some(kw => lowerName.includes(kw))
}

// Determine location based on activity
function getActivityLocation(name: string, isIndoor: boolean): LocationType {
  const lowerName = name.toLowerCase()
  if (lowerName.includes('gym') || lowerName.includes('weights') || lowerName.includes('spinning')) return 'gym'
  if (lowerName.includes('work') || lowerName.includes('office')) return 'office'
  if (isIndoor) return 'home'
  return 'outdoor'
}

// Transform Fitbit activity logs into our ActivityData format
export function transformActivities(
  activityData: FitbitActivityResponse | null,
  sleepData: FitbitSleepResponse | null,
  heartRateData: FitbitHeartRateResponse | null,
): ActivityData[] {
  const activities: ActivityData[] = []
  const date = new Date()

  // Get resting heart rate for sedentary estimates
  const restingHR = heartRateData?.['activities-heart']?.[0]?.value?.restingHeartRate || 65

  // Transform logged activities (workouts)
  if (activityData?.activities) {
    for (const activity of activityData.activities) {
      const activityType = mapFitbitActivity(activity.activityParentName || activity.name)
      const isIndoor = isActivityIndoor(activity.name)
      const location = getActivityLocation(activity.name, isIndoor)
      const durationMinutes = Math.round(activity.duration / 60000)

      // Parse start time
      const [hours, minutes] = (activity.startTime || '12:00').split(':').map(Number)
      const timestamp = new Date(activity.startDate || date)
      timestamp.setHours(hours, minutes, 0, 0)

      // Estimate heart rate based on activity type if not available
      const hrEstimate: Record<ActivityType, number> = {
        sleeping: restingHR - 10,
        resting: restingHR,
        walking: restingHR + 30,
        running: restingHR + 70,
        cycling: restingHR + 50,
        working: restingHR + 5,
        commuting: restingHR + 15,
      }

      activities.push({
        timestamp,
        activityType,
        heartRate: hrEstimate[activityType],
        steps: activity.steps || 0,
        calories: activity.calories || 0,
        isIndoor,
        location,
        duration: durationMinutes,
        source: 'fitbit' as ActivityData['source'],
      })
    }
  }

  // Transform sleep data into sleeping activities
  if (sleepData?.sleep) {
    for (const sleep of sleepData.sleep) {
      if (!sleep.isMainSleep) continue

      const startTime = new Date(sleep.startTime)
      const durationMinutes = sleep.minutesAsleep

      activities.push({
        timestamp: startTime,
        activityType: 'sleeping',
        heartRate: restingHR - 10,
        steps: 0,
        calories: Math.round(durationMinutes * 1.0),
        isIndoor: true,
        location: 'home',
        duration: durationMinutes,
        source: 'fitbit' as ActivityData['source'],
      })
    }
  }

  // Fill gaps with sedentary/resting time based on activity summary
  if (activityData?.summary) {
    const summary = activityData.summary
    const loggedMinutes = activities.reduce((sum, a) => sum + a.duration, 0)
    const sedentaryMinutes = summary.sedentaryMinutes || 0

    // If there's significant unaccounted sedentary time, add resting/working blocks
    // Use a lower threshold (0) when no activities are logged yet, to ensure we always
    // generate at least baseline activities from summary data
    const unaccountedMinutes = Math.max(0, sedentaryMinutes - loggedMinutes)
    if (unaccountedMinutes > 0 && (activities.length === 0 || unaccountedMinutes > 60)) {
      // Add working block (9am-5pm estimate)
      const workHours = Math.min(unaccountedMinutes, 480)
      activities.push({
        timestamp: new Date(date.setHours(9, 0, 0, 0)),
        activityType: 'working',
        heartRate: restingHR + 5,
        steps: Math.round((summary.steps || 0) * 0.2),
        calories: Math.round(workHours * 1.5),
        isIndoor: true,
        location: 'office',
        duration: workHours,
        source: 'fitbit' as ActivityData['source'],
      })

      // Add remaining as resting
      const restMinutes = unaccountedMinutes - workHours
      if (restMinutes > 30) {
        activities.push({
          timestamp: new Date(date.setHours(19, 0, 0, 0)),
          activityType: 'resting',
          heartRate: restingHR,
          steps: 0,
          calories: Math.round(restMinutes * 1.2),
          isIndoor: true,
          location: 'home',
          duration: restMinutes,
          source: 'fitbit' as ActivityData['source'],
        })
      }
    }

    // Add light/fairly active time as walking if not already accounted for
    const activeMinutesLogged = activities
      .filter(a => ['walking', 'running', 'cycling'].includes(a.activityType))
      .reduce((sum, a) => sum + a.duration, 0)

    const totalActiveMinutes = (summary.lightlyActiveMinutes || 0) + (summary.fairlyActiveMinutes || 0)
    const unloggedActiveMinutes = Math.max(0, totalActiveMinutes - activeMinutesLogged)

    if (unloggedActiveMinutes > 0) {
      activities.push({
        timestamp: new Date(date.setHours(12, 0, 0, 0)),
        activityType: 'walking',
        heartRate: restingHR + 25,
        steps: Math.round((summary.steps || 0) * 0.5),
        calories: Math.round(unloggedActiveMinutes * 4),
        isIndoor: false,
        location: 'outdoor',
        duration: unloggedActiveMinutes,
        source: 'fitbit' as ActivityData['source'],
      })
    }
  }

  return activities.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

// Build a Fitbit device data structure for the UI
export interface FitbitDeviceData {
  deviceId: string
  deviceName: string
  lastSync: Date
  displayName: string
  memberSince: string
  healthMetrics: {
    heartRate: number
    restingHeartRate: number
    spo2: number | null
    breathingRate: number | null
    sleepScore: number | null
  }
  dailyStats: {
    steps: number
    distance: number
    calories: number
    activeMinutes: number
    sedentaryMinutes: number
  }
  sleepData: {
    totalSleep: number
    deepSleep: number
    lightSleep: number
    remSleep: number
    awakeTime: number
  } | null
  heartRateZones: Array<{
    name: string
    minutes: number
    caloriesOut: number
  }>
}

export function buildFitbitDeviceData(data: {
  heartRate: FitbitHeartRateResponse | null
  activity: FitbitActivityResponse | null
  sleep: FitbitSleepResponse | null
  profile: FitbitProfileResponse | null
  spo2: FitbitSpO2Response | null
  breathingRate: FitbitBreathingRateResponse | null
}): FitbitDeviceData {
  const heartData = data.heartRate?.['activities-heart']?.[0]?.value
  const summary = data.activity?.summary
  const mainSleep = data.sleep?.sleep?.find(s => s.isMainSleep)

  return {
    deviceId: data.profile?.user?.encodedId || 'fitbit-user',
    deviceName: 'Fitbit',
    lastSync: new Date(),
    displayName: data.profile?.user?.displayName || 'Fitbit User',
    memberSince: data.profile?.user?.memberSince || '',
    healthMetrics: {
      heartRate: heartData?.restingHeartRate || summary?.restingHeartRate || 0,
      restingHeartRate: heartData?.restingHeartRate || summary?.restingHeartRate || 0,
      spo2: data.spo2?.value?.avg || null,
      breathingRate: data.breathingRate?.br?.[0]?.value?.breathingRate || null,
      sleepScore: mainSleep?.efficiency || null,
    },
    dailyStats: {
      steps: summary?.steps || 0,
      distance: summary?.distances?.find(d => d.activity === 'total')?.distance || 0,
      calories: summary?.caloriesOut || 0,
      activeMinutes: (summary?.fairlyActiveMinutes || 0) + (summary?.veryActiveMinutes || 0),
      sedentaryMinutes: summary?.sedentaryMinutes || 0,
    },
    sleepData: mainSleep ? {
      totalSleep: mainSleep.minutesAsleep / 60,
      deepSleep: (mainSleep.levels.summary.deep?.minutes || 0) / 60,
      lightSleep: (mainSleep.levels.summary.light?.minutes || 0) / 60,
      remSleep: (mainSleep.levels.summary.rem?.minutes || 0) / 60,
      awakeTime: (mainSleep.levels.summary.wake?.minutes || 0) / 60,
    } : null,
    heartRateZones: heartData?.heartRateZones?.map(z => ({
      name: z.name,
      minutes: z.minutes,
      caloriesOut: z.caloriesOut,
    })) || [],
  }
}
