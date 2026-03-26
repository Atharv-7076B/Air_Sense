import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateBMI } from '@/lib/health-multiplier'

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      include: { healthProfile: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      profile: user.healthProfile,
      userId: user.id,
    })
  } catch (error) {
    console.error('Failed to fetch health profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch health profile' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Get or create user
    let user = await prisma.user.findFirst()
    if (!user) {
      user = await prisma.user.create({ data: {} })
    }

    // Auto-calculate BMI if weight and height are provided
    let bmi = body.bmi
    if (body.weight && body.height && body.weight > 0 && body.height > 0) {
      bmi = calculateBMI(body.weight, body.height)
    }

    const profileData = {
      age: body.age ? parseInt(body.age, 10) : null,
      gender: body.gender || null,
      weight: body.weight ? parseFloat(body.weight) : null,
      height: body.height ? parseFloat(body.height) : null,
      bmi,
      smokingStatus: body.smokingStatus || 'never',

      // Respiratory conditions
      asthma: body.asthma ?? false,
      asthmaSeverity: body.asthma ? (body.asthmaSeverity || 'moderate') : null,
      copd: body.copd ?? false,
      copdSeverity: body.copd ? (body.copdSeverity || 'moderate') : null,
      bronchitis: body.bronchitis ?? false,
      bronchitisSeverity: body.bronchitis ? (body.bronchitisSeverity || 'moderate') : null,
      pneumonia: body.pneumonia ?? false,
      pneumoniaSeverity: body.pneumonia ? (body.pneumoniaSeverity || 'moderate') : null,
      tuberculosis: body.tuberculosis ?? false,
      tuberculosisSeverity: body.tuberculosis ? (body.tuberculosisSeverity || 'moderate') : null,
      allergicRhinitis: body.allergicRhinitis ?? false,
      allergicRhinitisSeverity: body.allergicRhinitis ? (body.allergicRhinitisSeverity || 'moderate') : null,
      sinusitis: body.sinusitis ?? false,
      sinusitisSeverity: body.sinusitis ? (body.sinusitisSeverity || 'moderate') : null,

      // Other conditions
      cardiovascularDisease: body.cardiovascularDisease ?? false,
      cardiovascularSeverity: body.cardiovascularDisease ? (body.cardiovascularSeverity || 'moderate') : null,
      diabetes: body.diabetes ?? false,
      diabetesSeverity: body.diabetes ? (body.diabetesSeverity || 'moderate') : null,
      immunocompromised: body.immunocompromised ?? false,
      pregnancy: body.pregnancy ?? false,

      // Duration
      asthmaDuration: body.asthmaDuration ? parseInt(body.asthmaDuration, 10) : null,
      copdDuration: body.copdDuration ? parseInt(body.copdDuration, 10) : null,
      bronchitisDuration: body.bronchitisDuration ? parseInt(body.bronchitisDuration, 10) : null,

      // Lifestyle
      exerciseFrequency: body.exerciseFrequency || null,
      dietQuality: body.dietQuality || null,
      yearsInCurrentCity: body.yearsInCurrentCity ? parseInt(body.yearsInCurrentCity, 10) : null,

      // Additional
      currentMedications: body.currentMedications || null,
      familyRespiratoryHistory: body.familyRespiratoryHistory ?? false,
      additionalConditions: body.additionalConditions || null,
    }

    // Upsert health profile
    const profile = await prisma.healthProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: {
        userId: user.id,
        ...profileData,
      },
    })

    return NextResponse.json({ profile, success: true })
  } catch (error) {
    console.error('Failed to save health profile:', error)
    return NextResponse.json(
      { error: 'Failed to save health profile' },
      { status: 500 }
    )
  }
}
