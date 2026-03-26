'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
  Button,
  Input,
  Select,
  Switch,
  Badge,
} from '@/components/ui'
import { CitySearch } from '@/components/ui/city-search'
import type { CitySearchResult } from '@/lib/city-search'
import { motion } from 'framer-motion'
import {
  User,
  MapPin,
  Home,
  Bell,
  Shield,
  Palette,
  Save,
  RefreshCw,
  Check,
  Watch,
  Link,
  Unlink,
  Loader2,
  HeartPulse,
} from 'lucide-react'
import { HealthProfileForm } from '@/components/settings/health-profile-form'

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SettingsContent />
    </Suspense>
  )
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const [name, setName] = useState('User')
  const [city, setCity] = useState('Mumbai')
  const [homeType, setHomeType] = useState('apartment')
  const [hasAC, setHasAC] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [dailyReport, setDailyReport] = useState(true)
  const [highAQIAlert, setHighAQIAlert] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Fitbit connection state
  const [fitbitConnected, setFitbitConnected] = useState(false)
  const [fitbitLoading, setFitbitLoading] = useState(true)
  const [fitbitUserId, setFitbitUserId] = useState<string | null>(null)
  const [fitbitConnectedAt, setFitbitConnectedAt] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [fitbitMessage, setFitbitMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  // Check Fitbit connection status
  useEffect(() => {
    const checkFitbitStatus = async () => {
      try {
        const res = await fetch('/api/fitbit/status')
        const data = await res.json()
        setFitbitConnected(data.connected)
        if (data.connected) {
          setFitbitUserId(data.fitbitUserId)
          setFitbitConnectedAt(data.connectedAt)
        }
      } catch {
        // Fitbit status check failed silently
      } finally {
        setFitbitLoading(false)
      }
    }
    checkFitbitStatus()
  }, [])

  // Handle OAuth callback messages
  useEffect(() => {
    const fitbitParam = searchParams.get('fitbit')
    if (fitbitParam === 'connected') {
      setFitbitMessage({ type: 'success', text: 'Fitbit connected successfully!' })
      setFitbitConnected(true)
      setTimeout(() => setFitbitMessage(null), 5000)
    } else if (fitbitParam === 'denied') {
      setFitbitMessage({ type: 'info', text: 'Fitbit authorization was denied.' })
      setTimeout(() => setFitbitMessage(null), 5000)
    } else if (fitbitParam === 'error') {
      setFitbitMessage({ type: 'error', text: 'Failed to connect Fitbit. Please try again.' })
      setTimeout(() => setFitbitMessage(null), 5000)
    }
  }, [searchParams])

  const handleDisconnectFitbit = async () => {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/fitbit/disconnect', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setFitbitConnected(false)
        setFitbitUserId(null)
        setFitbitConnectedAt(null)
        setFitbitMessage({ type: 'info', text: 'Fitbit disconnected.' })
        setTimeout(() => setFitbitMessage(null), 3000)
      }
    } catch {
      setFitbitMessage({ type: 'error', text: 'Failed to disconnect. Please try again.' })
    } finally {
      setDisconnecting(false)
    }
  }

  const handleCitySelect = (result: CitySearchResult) => setCity(result.name)
  const homeTypeOptions = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'house', label: 'House' },
  ]

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 800)
  }

  return (
    <div className="min-h-screen">
      <Header 
        title="Settings" 
        subtitle="Configure your preferences and profile" 
      />
      
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Profile Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <CardTitle>Profile</CardTitle>
              </div>
              <CardDescription>Your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Display Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Location Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <CardTitle>Location</CardTitle>
              </div>
              <CardDescription>Your city for AQI data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CitySearch
                value={city}
                onSelect={handleCitySelect}
                label="City"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                AQI data will be fetched for your selected city. More cities coming soon.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Home Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-primary" />
                <CardTitle>Home Environment</CardTitle>
              </div>
              <CardDescription>Configure your home setup for accurate calculations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Home Type"
                options={homeTypeOptions}
                value={homeType}
                onChange={(e) => setHomeType(e.target.value)}
              />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Air Conditioning</p>
                  <p className="text-xs text-muted-foreground">
                    AC helps filter indoor air and reduces exposure
                  </p>
                </div>
                <Switch
                  checked={hasAC}
                  onChange={setHasAC}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Health Profile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <HeartPulse className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Health Profile</h2>
            </div>
            <p className="text-sm text-muted-foreground px-1 mb-4">
              Your health background for personalized exposure scoring
            </p>
            <HealthProfileForm />
          </div>
        </motion.div>

        {/* Notification Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <CardDescription>Manage your alert preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Enable Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive alerts and updates
                  </p>
                </div>
                <Switch
                  checked={notifications}
                  onChange={setNotifications}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Daily Report</p>
                  <p className="text-xs text-muted-foreground">
                    Get daily exposure summary at 8 PM
                  </p>
                </div>
                <Switch
                  checked={dailyReport}
                  onChange={setDailyReport}
                  disabled={!notifications}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">High AQI Alert</p>
                  <p className="text-xs text-muted-foreground">
                    Get notified when city AQI exceeds 150
                  </p>
                </div>
                <Switch
                  checked={highAQIAlert}
                  onChange={setHighAQIAlert}
                  disabled={!notifications}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Connected Devices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Watch className="w-5 h-5 text-primary" />
                <CardTitle>Connected Devices</CardTitle>
              </div>
              <CardDescription>Connect your wearable for real health data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fitbitMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  fitbitMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                  fitbitMessage.type === 'error' ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                  'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                }`}>
                  {fitbitMessage.text}
                </div>
              )}

              <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#00B0B9]/10 flex items-center justify-center">
                    <Watch className="w-5 h-5 text-[#00B0B9]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Fitbit</p>
                    {fitbitLoading ? (
                      <p className="text-xs text-muted-foreground">Checking connection...</p>
                    ) : fitbitConnected ? (
                      <p className="text-xs text-muted-foreground">
                        Connected{fitbitUserId ? ` (ID: ${fitbitUserId})` : ''}
                        {fitbitConnectedAt && ` · Since ${new Date(fitbitConnectedAt).toLocaleDateString()}`}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Connect Fitbit, Noise, Pixel Watch & more
                      </p>
                    )}
                  </div>
                </div>

                {fitbitLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : fitbitConnected ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="success" size="sm">Connected</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnectFitbit}
                      loading={disconnecting}
                    >
                      <Unlink className="w-3.5 h-3.5 mr-1" />
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => { window.location.href = '/api/fitbit/auth' }}
                  >
                    <Link className="w-3.5 h-3.5 mr-1" />
                    Connect
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Connecting your Fitbit account enables real heart rate, steps, sleep, and activity data
                for more accurate exposure calculations.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data & Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle>Data & Privacy</CardTitle>
              </div>
              <CardDescription>Manage your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Data Storage</p>
                  <p className="text-xs text-muted-foreground">
                    All data is stored locally on your device
                  </p>
                </div>
                <Badge variant="success">Local Only</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Wearable Data</p>
                  <p className="text-xs text-muted-foreground">
                    {fitbitConnected ? 'Using real Fitbit data' : 'Connect a wearable for live data'}
                  </p>
                </div>
                <Badge variant={fitbitConnected ? 'success' : 'default'}>
                  {fitbitConnected ? 'Live Data' : 'Estimated'}
                </Badge>
              </div>
            </CardContent>
            <CardFooter className="flex gap-3">
              <Button variant="outline" size="sm">
                Export Data
              </Button>
              <Button variant="danger" size="sm">
                Clear All Data
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                <CardTitle>About AirSense</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  AirSense is a personalized air quality exposure tracker that helps you understand 
                  and manage your pollution intake based on your daily activities and location.
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <span>Version 1.0.0</span>
                  <span>•</span>
                  <span>Built with Next.js</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex justify-end gap-3 pt-4"
        >
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            loading={isSaving}
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
