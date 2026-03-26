'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Header } from '@/components/layout'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  CardSkeleton,
  CircularProgress,
} from '@/components/ui'
import { CitySearch } from '@/components/ui/city-search'
import {
  generateRecommendations,
  type AIRecommendation,
  type AIAnalysis
} from '@/lib/ai-client'
import { calculateExposure } from '@/lib/exposure-calculator'
import { getSimulatedAQI, type AQIData } from '@/lib/aqi-client'
import { cachedFetch } from '@/lib/client-cache'
import type { CitySearchResult } from '@/lib/city-search'
import { generateDayActivities } from '@/lib/wearable-simulator'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Wind,
  Heart,
  Home,
  Activity,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Info,
  Shield,
  Leaf,
  Clock,
  MapPin,
  AlertTriangle,
  Brain,
  Stethoscope,
  DoorOpen,
  Dumbbell,
} from 'lucide-react'
import type { FuzzyRecommendations } from '@/lib/fuzzy-client'

const categoryIcons = {
  air_purifier: Wind,
  lifestyle: Activity,
  health: Heart,
  activity: Activity,
  home: Home,
}

const categoryColors = {
  air_purifier: 'bg-primary/10 text-primary',
  lifestyle: 'bg-success/20 text-success-foreground',
  health: 'bg-danger/20 text-danger-foreground',
  activity: 'bg-warning/20 text-warning-foreground',
  home: 'bg-accent text-accent-foreground',
}

export default function RecommendationsPage() {
  const [city, setCity] = useState('Mumbai')
  const [hasAC, setHasAC] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [fuzzyResults, setFuzzyResults] = useState<FuzzyRecommendations | null>(null)
  const [isFuzzyMode, setIsFuzzyMode] = useState(false)
  const [reasoning, setReasoning] = useState<string[]>([])
  const [exposureData, setExposureData] = useState<{
    personalScore: number
    riskCategory: string
    indoorPercent: number
  } | null>(null)
  const [aqiData, setAqiData] = useState<{ aqi: number; city: string } | null>(null)

  const loadRecommendations = async () => {
    setIsLoading(true)

    let aqi: AQIData
    try {
      const result = await cachedFetch<{ data: AQIData }>(`/api/aqi?city=${encodeURIComponent(city)}`)
      aqi = result.data || getSimulatedAQI(city)
    } catch {
      aqi = getSimulatedAQI(city)
    }
    const activities = generateDayActivities(new Date())

    const exposure = calculateExposure({
      baseAQI: aqi.aqi,
      activities,
      hasAC,
      homeType: 'apartment',
    })

    setExposureData({
      personalScore: exposure.personalScore,
      riskCategory: exposure.riskCategory,
      indoorPercent: exposure.indoorPercent,
    })
    setAqiData({ aqi: aqi.aqi, city: aqi.city })

    // Try fuzzy logic first
    try {
      const res = await fetch('/api/fuzzy-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aqi: aqi.aqi,
          exposureScore: exposure.personalScore,
          timeOfDay: new Date().getHours(),
          activityType: 1, // light (default)
          forecastTrend: 0,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setFuzzyResults(data.recommendations)
        setReasoning(data.recommendations.reasoning || [])
        setIsFuzzyMode(true)
        setIsLoading(false)
        return
      }
    } catch {
      // Fuzzy service not available, fall back
    }

    // Fallback to rule-based
    const recommendations = generateRecommendations(exposure, aqi, {
      city,
      hasAC,
      homeType: 'apartment',
    })
    setAnalysis(recommendations)
    setIsFuzzyMode(false)
    setIsLoading(false)
  }

  const isInitialMount = useRef(true)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      loadRecommendations()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isInitialMount.current) {
      loadRecommendations()
    }
  }, [city, hasAC]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCitySelect = useCallback((result: CitySearchResult) => {
    setCity(result.name)
  }, [])

  const priorityOrder = { high: 0, medium: 1, low: 2 }
  const sortedRecommendations = analysis?.recommendations
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]) || []

  const airPurifierRecs = sortedRecommendations.filter(r => r.category === 'air_purifier')
  const lifestyleRecs = sortedRecommendations.filter(r => r.category !== 'air_purifier')

  return (
    <div className="min-h-screen">
      <Header
        title="Smart Recommendations"
        subtitle="Personalized recommendations based on your health profile and environment"
      />

      <div className="p-6 space-y-6">
        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-4"
        >
          <CitySearch
            value={city}
            onSelect={handleCitySelect}
            label="Your City"
            className="w-64"
            loading={isLoading}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasAC}
              onChange={(e) => setHasAC(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-foreground">Home has AC</span>
          </label>
          <Button
            variant="outline"
            onClick={loadRecommendations}
            loading={isLoading}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh Analysis
          </Button>
          {!isLoading && (
            <Badge variant={isFuzzyMode ? 'success' : 'default'} size="sm" className="ml-auto">
              <Brain className="w-3 h-3 mr-1" />
              {isFuzzyMode ? 'Advanced Analysis' : 'Basic Analysis'}
            </Badge>
          )}
        </motion.div>

        {isLoading ? (
          <div className="space-y-6">
            <CardSkeleton />
            <div className="grid md:grid-cols-2 gap-6">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </div>
        ) : isFuzzyMode && fuzzyResults && exposureData && aqiData ? (
          <>
            {/* Fuzzy Logic Summary */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 opacity-5"
                  style={{
                    background: `radial-gradient(circle at 20% 50%, ${
                      fuzzyResults.medicalAlert.value > 60 ? '#FECACA' :
                      fuzzyResults.outdoorSafety.value > 50 ? '#FDE68A' : '#A7F3D0'
                    }, transparent 60%)`,
                  }}
                />
                <CardContent className="relative pt-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <CircularProgress
                      value={exposureData.personalScore}
                      max={300}
                      size={100}
                      strokeWidth={10}
                      variant={
                        exposureData.riskCategory === 'low' ? 'success' :
                        exposureData.riskCategory === 'moderate' ? 'warning' : 'danger'
                      }
                      label="Score"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">Personalized Analysis</h3>
                      </div>
                      {reasoning.length > 0 && (
                        <div className="space-y-1.5">
                          {reasoning.map((reason, i) => (
                            <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-0.5">•</span>
                              {reason}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Fuzzy Recommendation Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FuzzyCard
                icon={<Shield className="w-5 h-5" />}
                title="Outdoor Safety"
                value={fuzzyResults.outdoorSafety.value}
                label={fuzzyResults.outdoorSafety.label}
                color={fuzzyResults.outdoorSafety.value > 65 ? 'danger' : fuzzyResults.outdoorSafety.value > 30 ? 'warning' : 'success'}
                index={0}
              />
              <FuzzyCard
                icon={<Wind className="w-5 h-5" />}
                title="Mask Recommendation"
                value={fuzzyResults.mask.value}
                label={fuzzyResults.mask.label}
                subtitle={fuzzyResults.mask.type || undefined}
                color={fuzzyResults.mask.value > 65 ? 'danger' : fuzzyResults.mask.value > 30 ? 'warning' : 'success'}
                index={1}
              />
              <FuzzyCard
                icon={<Home className="w-5 h-5" />}
                title="Air Purifier"
                value={fuzzyResults.purifier.value}
                label={fuzzyResults.purifier.label}
                color={fuzzyResults.purifier.value > 65 ? 'danger' : fuzzyResults.purifier.value > 30 ? 'warning' : 'success'}
                index={2}
              />
              <FuzzyCard
                icon={<Dumbbell className="w-5 h-5" />}
                title="Exercise"
                value={fuzzyResults.exercise.value}
                label={fuzzyResults.exercise.label}
                color={fuzzyResults.exercise.value > 65 ? 'danger' : fuzzyResults.exercise.value > 30 ? 'warning' : 'success'}
                index={3}
              />
              <FuzzyCard
                icon={<DoorOpen className="w-5 h-5" />}
                title="Ventilation"
                value={fuzzyResults.ventilation.value}
                label={fuzzyResults.ventilation.label}
                color={fuzzyResults.ventilation.value > 65 ? 'danger' : fuzzyResults.ventilation.value > 30 ? 'warning' : 'success'}
                index={4}
              />
              <FuzzyCard
                icon={<Stethoscope className="w-5 h-5" />}
                title="Medical Alert"
                value={fuzzyResults.medicalAlert.value}
                label={fuzzyResults.medicalAlert.label}
                color={fuzzyResults.medicalAlert.value > 65 ? 'danger' : fuzzyResults.medicalAlert.value > 30 ? 'warning' : 'success'}
                index={5}
              />
            </div>

            {/* Quick Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  Quick Tips for {city}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <QuickTip
                    icon={<Clock className="w-4 h-4" />}
                    title="Best Exercise Time"
                    description="5-7 AM or after 8 PM when pollution is lower"
                  />
                  <QuickTip
                    icon={<MapPin className="w-4 h-4" />}
                    title="Avoid Areas"
                    description="Construction sites, busy roads during rush hours"
                  />
                  <QuickTip
                    icon={<Wind className="w-4 h-4" />}
                    title="Indoor Air"
                    description={hasAC ? "Keep AC running to filter pollutants" : "Consider adding air purifying plants"}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        ) : analysis && exposureData && aqiData ? (
          <>
            {/* Rule-Based Fallback */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-5"
                  style={{
                    background: `radial-gradient(circle at 20% 50%, ${
                      analysis.urgency === 'immediate' ? '#FECACA' :
                      analysis.urgency === 'soon' ? '#FDE68A' : '#A7F3D0'
                    }, transparent 60%)`,
                  }}
                />
                <CardContent className="relative pt-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <CircularProgress
                      value={exposureData.personalScore}
                      max={300}
                      size={100}
                      strokeWidth={10}
                      variant={
                        exposureData.riskCategory === 'low' ? 'success' :
                        exposureData.riskCategory === 'moderate' ? 'warning' : 'danger'
                      }
                      label="Score"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-5 h-5 text-warning-foreground" />
                        <h3 className="text-lg font-semibold text-foreground">Analysis</h3>
                      </div>
                      <Badge variant={
                        analysis.urgency === 'immediate' ? 'danger' :
                        analysis.urgency === 'soon' ? 'warning' : 'success'
                      }>
                        {analysis.urgency === 'immediate' ? 'Immediate Action Needed' :
                         analysis.urgency === 'soon' ? 'Action Recommended' : 'Looking Good'}
                      </Badge>
                      <p className="text-foreground leading-relaxed mt-2">{analysis.summary}</p>
                      <p className="text-sm text-muted-foreground mt-1">{analysis.riskAssessment}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Air Purifier Section */}
            {airPurifierRecs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Air Purifier Recommendations</h2>
                  {analysis.airPurifierNeeded && (
                    <Badge variant="danger" size="sm">Recommended</Badge>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {airPurifierRecs.map((rec, index) => (
                    <RecommendationCard key={rec.id} recommendation={rec} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* Lifestyle Recommendations */}
            {lifestyleRecs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Leaf className="w-5 h-5 text-success-foreground" />
                  <h2 className="text-lg font-semibold text-foreground">Lifestyle Recommendations</h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lifestyleRecs.map((rec, index) => (
                    <RecommendationCard key={rec.id} recommendation={rec} index={index} compact />
                  ))}
                </div>
              </div>
            )}

            {/* Quick Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  Quick Tips for {city}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <QuickTip
                    icon={<Clock className="w-4 h-4" />}
                    title="Best Exercise Time"
                    description="5-7 AM or after 8 PM when pollution is lower"
                  />
                  <QuickTip
                    icon={<MapPin className="w-4 h-4" />}
                    title="Avoid Areas"
                    description="Construction sites, busy roads during rush hours"
                  />
                  <QuickTip
                    icon={<Wind className="w-4 h-4" />}
                    title="Indoor Air"
                    description={hasAC ? "Keep AC running to filter pollutants" : "Consider adding air purifying plants"}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  )
}

function FuzzyCard({
  icon,
  title,
  value,
  label,
  subtitle,
  color,
  index,
}: {
  icon: React.ReactNode
  title: string
  value: number
  label: string
  subtitle?: string
  color: 'success' | 'warning' | 'danger'
  index: number
}) {
  const colorMap = {
    success: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', bar: 'bg-emerald-500' },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-600', bar: 'bg-amber-500' },
    danger: { bg: 'bg-red-500/10', text: 'text-red-600', bar: 'bg-red-500' },
  }
  const colors = colorMap[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card className="h-full">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <Badge variant={color} size="sm">{label}</Badge>
            </div>
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
          )}
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${colors.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${value}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {Math.round(value)}/100
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function RecommendationCard({
  recommendation,
  index,
  compact = false,
}: {
  recommendation: AIRecommendation
  index: number
  compact?: boolean
}) {
  const Icon = categoryIcons[recommendation.category] || Activity
  const colorClass = categoryColors[recommendation.category] || categoryColors.lifestyle

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-foreground truncate">
                  {recommendation.title}
                </h3>
                <Badge
                  variant={
                    recommendation.priority === 'high' ? 'danger' :
                    recommendation.priority === 'medium' ? 'warning' : 'default'
                  }
                  size="sm"
                >
                  {recommendation.priority}
                </Badge>
              </div>
              <p className={`text-sm text-muted-foreground ${compact ? 'line-clamp-2' : ''}`}>
                {recommendation.description}
              </p>

              {recommendation.product && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-foreground text-sm">
                    {recommendation.product.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {recommendation.product.specs}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-medium text-primary">
                      {recommendation.product.priceRange}
                    </span>
                    <Button variant="ghost" size="sm" className="text-xs">
                      Learn More <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {recommendation.actionable && !recommendation.product && (
                <div className="mt-3 flex items-center gap-1 text-xs text-primary">
                  <CheckCircle2 className="w-3 h-3" />
                  Actionable recommendation
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function QuickTip({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  )
}
