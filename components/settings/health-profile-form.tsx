'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Button,
  Input,
  Select,
  Switch,
  Badge,
} from '@/components/ui'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HeartPulse,
  Save,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Activity,
  Baby,
  Cigarette,
} from 'lucide-react'
import { calculateHealthMultiplier, calculateBMI, getBMICategory } from '@/lib/health-multiplier'
import type { HealthProfile, HealthVulnerability } from '@/lib/health-multiplier'

interface ConditionFieldProps {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  severity?: string | null
  onSeverityChange?: (severity: string) => void
  duration?: number | null
  onDurationChange?: (duration: number) => void
  showDuration?: boolean
}

function ConditionField({
  label,
  checked,
  onCheckedChange,
  severity,
  onSeverityChange,
  duration,
  onDurationChange,
  showDuration = false,
}: ConditionFieldProps) {
  const severityOptions = [
    { value: 'mild', label: 'Mild' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'severe', label: 'Severe' },
  ]

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between py-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <Switch checked={checked} onChange={onCheckedChange} />
      </div>
      <AnimatePresence>
        {checked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-3 pl-4 pb-2">
              {onSeverityChange && (
                <Select
                  label="Severity"
                  options={severityOptions}
                  value={severity || 'moderate'}
                  onChange={(e) => onSeverityChange(e.target.value)}
                  className="text-xs"
                />
              )}
              {showDuration && onDurationChange && (
                <Input
                  label="Years"
                  type="number"
                  min={0}
                  max={100}
                  value={duration ?? ''}
                  onChange={(e) => onDurationChange(parseInt(e.target.value, 10) || 0)}
                  placeholder="Years"
                  className="text-xs w-24"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function HealthProfileForm() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    respiratory: false,
    other: false,
    lifestyle: false,
  })

  // Form state
  const [age, setAge] = useState<string>('')
  const [gender, setGender] = useState('male')
  const [weight, setWeight] = useState<string>('')
  const [height, setHeight] = useState<string>('')
  const [smokingStatus, setSmokingStatus] = useState('never')

  // Respiratory conditions
  const [asthma, setAsthma] = useState(false)
  const [asthmaSeverity, setAsthmaSeverity] = useState('moderate')
  const [asthmaDuration, setAsthmaDuration] = useState<number>(0)
  const [copd, setCopd] = useState(false)
  const [copdSeverity, setCopdSeverity] = useState('moderate')
  const [copdDuration, setCopdDuration] = useState<number>(0)
  const [bronchitis, setBronchitis] = useState(false)
  const [bronchitisSeverity, setBronchitisSeverity] = useState('moderate')
  const [bronchitisDuration, setBronchitisDuration] = useState<number>(0)
  const [pneumonia, setPneumonia] = useState(false)
  const [pneumoniaSeverity, setPneumoniaSeverity] = useState('moderate')
  const [tuberculosis, setTuberculosis] = useState(false)
  const [tuberculosisSeverity, setTuberculosisSeverity] = useState('moderate')
  const [allergicRhinitis, setAllergicRhinitis] = useState(false)
  const [allergicRhinitisSeverity, setAllergicRhinitisSeverity] = useState('moderate')
  const [sinusitis, setSinusitis] = useState(false)
  const [sinusitisSeverity, setSinusitisSeverity] = useState('moderate')

  // Other conditions
  const [cardiovascularDisease, setCardiovascularDisease] = useState(false)
  const [cardiovascularSeverity, setCardiovascularSeverity] = useState('moderate')
  const [diabetes, setDiabetes] = useState(false)
  const [diabetesSeverity, setDiabetesSeverity] = useState('moderate')
  const [immunocompromised, setImmunocompromised] = useState(false)
  const [pregnancy, setPregnancy] = useState(false)

  // Lifestyle
  const [exerciseFrequency, setExerciseFrequency] = useState('moderate')
  const [dietQuality, setDietQuality] = useState('good')
  const [yearsInCurrentCity, setYearsInCurrentCity] = useState<string>('')
  const [currentMedications, setCurrentMedications] = useState('')
  const [familyRespiratoryHistory, setFamilyRespiratoryHistory] = useState(false)

  // Computed values
  const [vulnerability, setVulnerability] = useState<HealthVulnerability | null>(null)

  // Compute BMI
  const computedBMI = weight && height && parseFloat(weight) > 0 && parseFloat(height) > 0
    ? calculateBMI(parseFloat(weight), parseFloat(height))
    : null

  // Compute vulnerability whenever form changes
  useEffect(() => {
    const profile: HealthProfile = {
      age: age ? parseInt(age, 10) : null,
      gender,
      weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
      bmi: computedBMI,
      smokingStatus,
      asthma, asthmaSeverity: asthma ? asthmaSeverity : null,
      copd, copdSeverity: copd ? copdSeverity : null,
      bronchitis, bronchitisSeverity: bronchitis ? bronchitisSeverity : null,
      pneumonia, pneumoniaSeverity: pneumonia ? pneumoniaSeverity : null,
      tuberculosis, tuberculosisSeverity: tuberculosis ? tuberculosisSeverity : null,
      allergicRhinitis, allergicRhinitisSeverity: allergicRhinitis ? allergicRhinitisSeverity : null,
      sinusitis, sinusitisSeverity: sinusitis ? sinusitisSeverity : null,
      cardiovascularDisease, cardiovascularSeverity: cardiovascularDisease ? cardiovascularSeverity : null,
      diabetes, diabetesSeverity: diabetes ? diabetesSeverity : null,
      immunocompromised,
      pregnancy,
      familyRespiratoryHistory,
    }
    setVulnerability(calculateHealthMultiplier(profile))
  }, [
    age, gender, weight, height, smokingStatus,
    asthma, asthmaSeverity, copd, copdSeverity, bronchitis, bronchitisSeverity,
    pneumonia, pneumoniaSeverity, tuberculosis, tuberculosisSeverity,
    allergicRhinitis, allergicRhinitisSeverity, sinusitis, sinusitisSeverity,
    cardiovascularDisease, cardiovascularSeverity, diabetes, diabetesSeverity,
    immunocompromised, pregnancy, familyRespiratoryHistory, computedBMI,
  ])

  // Load existing profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/health-profile')
        const data = await res.json()
        if (data.profile) {
          const p = data.profile
          if (p.age) setAge(String(p.age))
          if (p.gender) setGender(p.gender)
          if (p.weight) setWeight(String(p.weight))
          if (p.height) setHeight(String(p.height))
          if (p.smokingStatus) setSmokingStatus(p.smokingStatus)
          setAsthma(p.asthma ?? false)
          if (p.asthmaSeverity) setAsthmaSeverity(p.asthmaSeverity)
          if (p.asthmaDuration) setAsthmaDuration(p.asthmaDuration)
          setCopd(p.copd ?? false)
          if (p.copdSeverity) setCopdSeverity(p.copdSeverity)
          if (p.copdDuration) setCopdDuration(p.copdDuration)
          setBronchitis(p.bronchitis ?? false)
          if (p.bronchitisSeverity) setBronchitisSeverity(p.bronchitisSeverity)
          if (p.bronchitisDuration) setBronchitisDuration(p.bronchitisDuration)
          setPneumonia(p.pneumonia ?? false)
          if (p.pneumoniaSeverity) setPneumoniaSeverity(p.pneumoniaSeverity)
          setTuberculosis(p.tuberculosis ?? false)
          if (p.tuberculosisSeverity) setTuberculosisSeverity(p.tuberculosisSeverity)
          setAllergicRhinitis(p.allergicRhinitis ?? false)
          if (p.allergicRhinitisSeverity) setAllergicRhinitisSeverity(p.allergicRhinitisSeverity)
          setSinusitis(p.sinusitis ?? false)
          if (p.sinusitisSeverity) setSinusitisSeverity(p.sinusitisSeverity)
          setCardiovascularDisease(p.cardiovascularDisease ?? false)
          if (p.cardiovascularSeverity) setCardiovascularSeverity(p.cardiovascularSeverity)
          setDiabetes(p.diabetes ?? false)
          if (p.diabetesSeverity) setDiabetesSeverity(p.diabetesSeverity)
          setImmunocompromised(p.immunocompromised ?? false)
          setPregnancy(p.pregnancy ?? false)
          if (p.exerciseFrequency) setExerciseFrequency(p.exerciseFrequency)
          if (p.dietQuality) setDietQuality(p.dietQuality)
          if (p.yearsInCurrentCity) setYearsInCurrentCity(String(p.yearsInCurrentCity))
          if (p.currentMedications) setCurrentMedications(p.currentMedications)
          setFamilyRespiratoryHistory(p.familyRespiratoryHistory ?? false)
        }
      } catch {
        // No existing profile
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/health-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age, gender, weight, height, smokingStatus,
          asthma, asthmaSeverity, asthmaDuration,
          copd, copdSeverity, copdDuration,
          bronchitis, bronchitisSeverity, bronchitisDuration,
          pneumonia, pneumoniaSeverity,
          tuberculosis, tuberculosisSeverity,
          allergicRhinitis, allergicRhinitisSeverity,
          sinusitis, sinusitisSeverity,
          cardiovascularDisease, cardiovascularSeverity,
          diabetes, diabetesSeverity,
          immunocompromised, pregnancy,
          exerciseFrequency, dietQuality, yearsInCurrentCity,
          currentMedications, familyRespiratoryHistory,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        setError(data.error || 'Failed to save')
      }
    } catch {
      setError('Failed to save health profile')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ]

  const smokingOptions = [
    { value: 'never', label: 'Never smoked' },
    { value: 'former', label: 'Former smoker' },
    { value: 'current', label: 'Current smoker' },
  ]

  const exerciseOptions = [
    { value: 'sedentary', label: 'Sedentary' },
    { value: 'light', label: 'Light (1-2 days/week)' },
    { value: 'moderate', label: 'Moderate (3-4 days/week)' },
    { value: 'active', label: 'Active (5-6 days/week)' },
    { value: 'very_active', label: 'Very Active (daily)' },
  ]

  const dietOptions = [
    { value: 'poor', label: 'Poor' },
    { value: 'fair', label: 'Fair' },
    { value: 'good', label: 'Good' },
    { value: 'excellent', label: 'Excellent' },
  ]

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Vulnerability Score Summary */}
      {vulnerability && vulnerability.score > 1.0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`border-l-4 ${
            vulnerability.riskLevel === 'high' ? 'border-l-red-500 bg-red-500/5' :
            vulnerability.riskLevel === 'medium' ? 'border-l-amber-500 bg-amber-500/5' :
            'border-l-blue-500 bg-blue-500/5'
          }`}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-5 h-5 ${
                    vulnerability.riskLevel === 'high' ? 'text-red-500' :
                    vulnerability.riskLevel === 'medium' ? 'text-amber-500' :
                    'text-blue-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Health Vulnerability Score: {vulnerability.score}x
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {vulnerability.factors.length} factor{vulnerability.factors.length !== 1 ? 's' : ''} affecting your exposure sensitivity
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    vulnerability.riskLevel === 'high' ? 'danger' :
                    vulnerability.riskLevel === 'medium' ? 'warning' : 'default'
                  }
                >
                  {vulnerability.riskLevel} vulnerability
                </Badge>
              </div>
              {vulnerability.factors.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {vulnerability.factors.map((factor, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {factor}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('basic')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-primary" />
              <CardTitle>Basic Information</CardTitle>
            </div>
            {expandedSections.basic ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <CardDescription>Age, gender, body metrics, and smoking status</CardDescription>
        </CardHeader>
        <AnimatePresence>
          {expandedSections.basic && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Age"
                    type="number"
                    min={1}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g., 28"
                  />
                  <Select
                    label="Gender"
                    options={genderOptions}
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Weight (kg)"
                    type="number"
                    min={1}
                    max={300}
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g., 70"
                  />
                  <Input
                    label="Height (cm)"
                    type="number"
                    min={50}
                    max={250}
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="e.g., 175"
                  />
                </div>
                {computedBMI && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      BMI: <span className="font-medium text-foreground">{computedBMI}</span>
                      {' '}
                      <span className={`text-xs ${
                        computedBMI < 18.5 || computedBMI >= 30 ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        ({getBMICategory(computedBMI)})
                      </span>
                    </p>
                  </div>
                )}
                <Select
                  label="Smoking Status"
                  options={smokingOptions}
                  value={smokingStatus}
                  onChange={(e) => setSmokingStatus(e.target.value)}
                />
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Respiratory Conditions */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('respiratory')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <CardTitle>Respiratory Conditions</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {(asthma || copd || bronchitis || pneumonia || tuberculosis || allergicRhinitis || sinusitis) && (
                <Badge variant="warning" size="sm">
                  {[asthma, copd, bronchitis, pneumonia, tuberculosis, allergicRhinitis, sinusitis].filter(Boolean).length} active
                </Badge>
              )}
              {expandedSections.respiratory ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
          <CardDescription>Past and current respiratory conditions</CardDescription>
        </CardHeader>
        <AnimatePresence>
          {expandedSections.respiratory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="space-y-3 divide-y divide-border">
                <ConditionField
                  label="Asthma"
                  checked={asthma}
                  onCheckedChange={setAsthma}
                  severity={asthmaSeverity}
                  onSeverityChange={setAsthmaSeverity}
                  duration={asthmaDuration}
                  onDurationChange={setAsthmaDuration}
                  showDuration
                />
                <ConditionField
                  label="COPD (Chronic Obstructive Pulmonary Disease)"
                  checked={copd}
                  onCheckedChange={setCopd}
                  severity={copdSeverity}
                  onSeverityChange={setCopdSeverity}
                  duration={copdDuration}
                  onDurationChange={setCopdDuration}
                  showDuration
                />
                <ConditionField
                  label="Bronchitis"
                  checked={bronchitis}
                  onCheckedChange={setBronchitis}
                  severity={bronchitisSeverity}
                  onSeverityChange={setBronchitisSeverity}
                  duration={bronchitisDuration}
                  onDurationChange={setBronchitisDuration}
                  showDuration
                />
                <ConditionField
                  label="Pneumonia (past or current)"
                  checked={pneumonia}
                  onCheckedChange={setPneumonia}
                  severity={pneumoniaSeverity}
                  onSeverityChange={setPneumoniaSeverity}
                />
                <ConditionField
                  label="Tuberculosis"
                  checked={tuberculosis}
                  onCheckedChange={setTuberculosis}
                  severity={tuberculosisSeverity}
                  onSeverityChange={setTuberculosisSeverity}
                />
                <ConditionField
                  label="Allergic Rhinitis"
                  checked={allergicRhinitis}
                  onCheckedChange={setAllergicRhinitis}
                  severity={allergicRhinitisSeverity}
                  onSeverityChange={setAllergicRhinitisSeverity}
                />
                <ConditionField
                  label="Sinusitis"
                  checked={sinusitis}
                  onCheckedChange={setSinusitis}
                  severity={sinusitisSeverity}
                  onSeverityChange={setSinusitisSeverity}
                />
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Other Conditions */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('other')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Baby className="w-5 h-5 text-primary" />
              <CardTitle>Other Conditions</CardTitle>
            </div>
            {expandedSections.other ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <CardDescription>Cardiovascular, metabolic, and other conditions</CardDescription>
        </CardHeader>
        <AnimatePresence>
          {expandedSections.other && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="space-y-3 divide-y divide-border">
                <ConditionField
                  label="Cardiovascular Disease"
                  checked={cardiovascularDisease}
                  onCheckedChange={setCardiovascularDisease}
                  severity={cardiovascularSeverity}
                  onSeverityChange={setCardiovascularSeverity}
                />
                <ConditionField
                  label="Diabetes"
                  checked={diabetes}
                  onCheckedChange={setDiabetes}
                  severity={diabetesSeverity}
                  onSeverityChange={setDiabetesSeverity}
                />
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Immunocompromised</p>
                    <p className="text-xs text-muted-foreground">Weakened immune system</p>
                  </div>
                  <Switch checked={immunocompromised} onChange={setImmunocompromised} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Pregnancy</p>
                    <p className="text-xs text-muted-foreground">Currently pregnant</p>
                  </div>
                  <Switch checked={pregnancy} onChange={setPregnancy} />
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Lifestyle & Family History */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('lifestyle')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cigarette className="w-5 h-5 text-primary" />
              <CardTitle>Lifestyle & Family History</CardTitle>
            </div>
            {expandedSections.lifestyle ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <CardDescription>Exercise, diet, medications, and family history</CardDescription>
        </CardHeader>
        <AnimatePresence>
          {expandedSections.lifestyle && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Exercise Frequency"
                    options={exerciseOptions}
                    value={exerciseFrequency}
                    onChange={(e) => setExerciseFrequency(e.target.value)}
                  />
                  <Select
                    label="Diet Quality"
                    options={dietOptions}
                    value={dietQuality}
                    onChange={(e) => setDietQuality(e.target.value)}
                  />
                </div>
                <Input
                  label="Years in Current City"
                  type="number"
                  min={0}
                  max={100}
                  value={yearsInCurrentCity}
                  onChange={(e) => setYearsInCurrentCity(e.target.value)}
                  placeholder="e.g., 5"
                />
                <Input
                  label="Current Medications"
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                  placeholder="e.g., Albuterol inhaler, Montelukast"
                />
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Family Respiratory History</p>
                    <p className="text-xs text-muted-foreground">
                      Close family members with respiratory conditions
                    </p>
                  </div>
                  <Switch checked={familyRespiratoryHistory} onChange={setFamilyRespiratoryHistory} />
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 text-red-600 border border-red-500/20 text-sm">
          {error}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
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
              Save Health Profile
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
