'use client'

import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/layout'
import { DeviceCard, ActivityTimeline } from '@/components/simulator'
import { Card, CardHeader, CardTitle, CardContent, Badge, CardSkeleton } from '@/components/ui'
import {
  generateAppleWatchData,
  generateNoiseBandData,
  generateDayActivities,
  type AppleWatchData,
  type NoiseBandData,
  type ActivityData,
} from '@/lib/wearable-simulator'
import type { FitbitDeviceData } from '@/lib/fitbit-transformer'
import { motion } from 'framer-motion'
import { RefreshCw, Info, Wifi, WifiOff, Watch } from 'lucide-react'

export default function WearablesPage() {
  const [appleWatch, setAppleWatch] = useState<AppleWatchData | null>(null)
  const [noiseBand, setNoiseBand] = useState<NoiseBandData | null>(null)
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fitbit state
  const [fitbitConnected, setFitbitConnected] = useState(false)
  const [fitbitDevice, setFitbitDevice] = useState<FitbitDeviceData | null>(null)
  const [fitbitActivities, setFitbitActivities] = useState<ActivityData[]>([])
  const [fitbitLoading, setFitbitLoading] = useState(false)
  const [fitbitError, setFitbitError] = useState<string | null>(null)

  const refreshSimulatedData = () => {
    setIsLoading(true)
    setTimeout(() => {
      setAppleWatch(generateAppleWatchData())
      setNoiseBand(generateNoiseBandData())
      setActivities(generateDayActivities(new Date()))
      setIsLoading(false)
    }, 500)
  }

  const fetchFitbitData = async () => {
    setFitbitLoading(true)
    setFitbitError(null)
    try {
      const res = await fetch('/api/fitbit/data?type=summary')
      const data = await res.json()
      if (data.connected) {
        setFitbitConnected(true)
        setFitbitDevice(data.device)
        setFitbitActivities(data.activities || [])
      } else {
        setFitbitConnected(false)
      }
    } catch {
      setFitbitError('Failed to fetch Fitbit data')
      setFitbitConnected(false)
    } finally {
      setFitbitLoading(false)
    }
  }

  const refreshAll = () => {
    refreshSimulatedData()
    if (fitbitConnected) fetchFitbitData()
  }

  const isInitialMount = useRef(true)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      refreshSimulatedData()
      fetchFitbitData()
    }
  }, [])

  // Determine which activities to show (prefer Fitbit when connected)
  const displayActivities = fitbitConnected && fitbitActivities.length > 0
    ? fitbitActivities
    : activities

  const dataSource = fitbitConnected && fitbitActivities.length > 0 ? 'live' : 'simulated'

  return (
    <div className="min-h-screen">
      <Header
        title="Wearables"
        subtitle="Manage your connected devices and view activity data"
      />

      <div className="p-6 space-y-6">
        {/* Info banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 p-4 rounded-xl border ${
            fitbitConnected
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-primary/10 border-primary/20'
          }`}
        >
          {fitbitConnected ? (
            <Wifi className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-primary shrink-0" />
          )}
          <p className="text-sm text-foreground">
            {fitbitConnected ? (
              <>
                <span className="font-medium">Live Data Mode:</span> Showing real data from your connected Fitbit device.
                Additional device cards are shown below for reference.
              </>
            ) : (
              <>
                <span className="font-medium">Demo Mode:</span> Connect your Fitbit in{' '}
                <a href="/settings" className="text-primary underline">Settings</a>
                {' '}for real data.
              </>
            )}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={refreshAll}
            disabled={isLoading || fitbitLoading}
            className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${(isLoading || fitbitLoading) ? 'animate-spin' : ''}`} />
            Refresh All
          </motion.button>
        </motion.div>

        {/* Fitbit Device Card (when connected) */}
        {fitbitConnected && fitbitDevice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-foreground">Live Device</span>
              <Badge variant="success" size="sm">Real Data</Badge>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <DeviceCard
                deviceName={fitbitDevice.deviceName}
                deviceId={fitbitDevice.deviceId}
                batteryLevel={100}
                lastSync={fitbitDevice.lastSync}
                isConnected={true}
                type="fitbit"
                metrics={{
                  heartRate: fitbitDevice.healthMetrics.heartRate,
                  steps: fitbitDevice.dailyStats.steps,
                  calories: fitbitDevice.dailyStats.calories,
                  activeMinutes: fitbitDevice.dailyStats.activeMinutes,
                }}
                onSync={fetchFitbitData}
              />

              {/* Fitbit Health Metrics Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Fitbit Health Metrics
                    <Badge variant="success" size="sm">Live</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <MetricRow
                      label="Resting HR"
                      value={`${fitbitDevice.healthMetrics.restingHeartRate} bpm`}
                    />
                    <MetricRow
                      label="SpO2"
                      value={fitbitDevice.healthMetrics.spo2
                        ? `${fitbitDevice.healthMetrics.spo2.toFixed(1)}%`
                        : 'N/A'}
                    />
                    <MetricRow
                      label="Breathing Rate"
                      value={fitbitDevice.healthMetrics.breathingRate
                        ? `${fitbitDevice.healthMetrics.breathingRate.toFixed(1)}/min`
                        : 'N/A'}
                    />
                    <MetricRow
                      label="Sleep Score"
                      value={fitbitDevice.healthMetrics.sleepScore
                        ? `${fitbitDevice.healthMetrics.sleepScore}/100`
                        : 'N/A'}
                    />
                    <MetricRow
                      label="Distance"
                      value={`${fitbitDevice.dailyStats.distance.toFixed(2)} km`}
                    />
                    <MetricRow
                      label="Sedentary"
                      value={`${fitbitDevice.dailyStats.sedentaryMinutes} min`}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fitbit Sleep Data */}
            {fitbitDevice.sleepData && (
              <div className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Fitbit Sleep Data
                      <Badge variant="primary" size="sm">Last Night</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <MetricRow
                        label="Total Sleep"
                        value={`${fitbitDevice.sleepData.totalSleep.toFixed(1)} hrs`}
                      />
                      <MetricRow
                        label="Deep Sleep"
                        value={`${fitbitDevice.sleepData.deepSleep.toFixed(1)} hrs`}
                      />
                      <MetricRow
                        label="Light Sleep"
                        value={`${fitbitDevice.sleepData.lightSleep.toFixed(1)} hrs`}
                      />
                      <MetricRow
                        label="REM Sleep"
                        value={`${fitbitDevice.sleepData.remSleep.toFixed(1)} hrs`}
                      />
                      <MetricRow
                        label="Awake Time"
                        value={`${fitbitDevice.sleepData.awakeTime.toFixed(1)} hrs`}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        )}

        {fitbitError && (
          <div className="p-3 rounded-lg bg-red-500/10 text-red-600 border border-red-500/20 text-sm">
            {fitbitError}
          </div>
        )}

        {/* Additional device cards */}
        <div>
          {fitbitConnected && (
            <div className="mb-3 flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Other Devices</span>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-6">
            {isLoading ? (
              <>
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : (
              <>
                {appleWatch && (
                  <DeviceCard
                    deviceName={appleWatch.deviceName}
                    deviceId={appleWatch.deviceId}
                    batteryLevel={appleWatch.batteryLevel}
                    lastSync={appleWatch.lastSync}
                    isConnected={true}
                    type="apple_watch"
                    metrics={{
                      heartRate: appleWatch.healthMetrics.heartRate,
                      steps: appleWatch.activityRings.moveCalories > 0
                        ? Math.round(appleWatch.activityRings.moveCalories * 15)
                        : 0,
                      calories: appleWatch.activityRings.moveCalories,
                      activeMinutes: appleWatch.activityRings.exerciseMinutes,
                    }}
                    onSync={() => setAppleWatch(generateAppleWatchData())}
                  />
                )}
                {noiseBand && (
                  <DeviceCard
                    deviceName={noiseBand.deviceName}
                    deviceId={noiseBand.deviceId}
                    batteryLevel={noiseBand.batteryLevel}
                    lastSync={noiseBand.lastSync}
                    isConnected={true}
                    type="noise_band"
                    metrics={{
                      heartRate: noiseBand.healthMetrics.heartRate,
                      steps: noiseBand.dailyStats.steps,
                      calories: noiseBand.dailyStats.calories,
                      activeMinutes: noiseBand.dailyStats.activeMinutes,
                    }}
                    onSync={() => setNoiseBand(generateNoiseBandData())}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Health metrics detail */}
        <div className="grid md:grid-cols-2 gap-6">
          {appleWatch && !isLoading && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Apple Watch Health Metrics
                  <Badge variant="success" size="sm">Live</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <MetricRow
                    label="Resting HR"
                    value={`${appleWatch.healthMetrics.restingHeartRate} bpm`}
                  />
                  <MetricRow
                    label="HRV"
                    value={`${appleWatch.healthMetrics.heartRateVariability} ms`}
                  />
                  <MetricRow
                    label="Blood Oxygen"
                    value={`${appleWatch.healthMetrics.bloodOxygen.toFixed(1)}%`}
                  />
                  <MetricRow
                    label="Respiratory"
                    value={`${appleWatch.healthMetrics.respiratoryRate.toFixed(1)}/min`}
                  />
                  <MetricRow
                    label="Body Temp"
                    value={`${appleWatch.healthMetrics.bodyTemperature.toFixed(1)}°C`}
                  />
                  <MetricRow
                    label="Stand Hours"
                    value={`${appleWatch.activityRings.standHours}/${appleWatch.activityRings.standGoal}`}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {noiseBand && !isLoading && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Noise Band Sleep Data
                  <Badge variant="primary" size="sm">Last Night</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <MetricRow
                    label="Total Sleep"
                    value={`${noiseBand.sleepData.totalSleep.toFixed(1)} hrs`}
                  />
                  <MetricRow
                    label="Sleep Score"
                    value={`${noiseBand.healthMetrics.sleepScore}/100`}
                  />
                  <MetricRow
                    label="Deep Sleep"
                    value={`${noiseBand.sleepData.deepSleep.toFixed(1)} hrs`}
                  />
                  <MetricRow
                    label="Light Sleep"
                    value={`${noiseBand.sleepData.lightSleep.toFixed(1)} hrs`}
                  />
                  <MetricRow
                    label="REM Sleep"
                    value={`${noiseBand.sleepData.remSleep.toFixed(1)} hrs`}
                  />
                  <MetricRow
                    label="Stress Level"
                    value={`${noiseBand.healthMetrics.stressLevel}/100`}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Activity timeline */}
        {displayActivities.length > 0 && !isLoading && (
          <div>
            {dataSource === 'live' && (
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="success" size="sm">Real Activity Data</Badge>
                <span className="text-xs text-muted-foreground">From your Fitbit device</span>
              </div>
            )}
            <ActivityTimeline activities={displayActivities} />
          </div>
        )}
      </div>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}
