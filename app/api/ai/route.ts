import { NextResponse } from 'next/server'
import { generateRecommendations, callHuggingFaceAPI, generateAIPrompt } from '@/lib/ai-client'
import { calculateExposure } from '@/lib/exposure-calculator'
import { getAQI } from '@/lib/aqi-client'
import { generateDayActivities } from '@/lib/wearable-simulator'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city') || 'Mumbai'
  const hasAC = searchParams.get('hasAC') !== 'false'
  const homeType = searchParams.get('homeType') || 'apartment'

  try {
    // Get real AQI and activity data
    const aqiData = await getAQI(city)
    const activities = generateDayActivities(new Date())

    // Calculate exposure
    const exposure = calculateExposure({
      baseAQI: aqiData.aqi,
      activities,
      hasAC,
      homeType: homeType as 'apartment' | 'house',
    })

    // Generate recommendations
    const analysis = generateRecommendations(exposure, aqiData, {
      city,
      hasAC,
      homeType,
    })

    return NextResponse.json({
      analysis,
      exposure: {
        personalScore: exposure.personalScore,
        riskCategory: exposure.riskCategory,
        indoorPercent: exposure.indoorPercent,
      },
      cityAQI: aqiData,
    })
  } catch (error) {
    console.error('AI recommendation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      city = 'Mumbai', 
      hasAC = true, 
      homeType = 'apartment',
      useHuggingFace = false,
    } = body

    // Get real AQI and activity data
    const aqiData = await getAQI(city)
    const activities = generateDayActivities(new Date())

    // Calculate exposure
    const exposure = calculateExposure({
      baseAQI: aqiData.aqi,
      activities,
      hasAC,
      homeType: homeType as 'apartment' | 'house',
    })

    // Generate recommendations using local logic
    const analysis = generateRecommendations(exposure, aqiData, {
      city,
      hasAC,
      homeType,
    })

    // Optionally enhance with Hugging Face API
    let aiEnhancedSummary = null
    if (useHuggingFace) {
      const apiKey = process.env.HUGGINGFACE_API_KEY
      if (apiKey) {
        const prompt = generateAIPrompt(exposure, aqiData, { city, hasAC })
        aiEnhancedSummary = await callHuggingFaceAPI(prompt, apiKey)
      }
    }

    return NextResponse.json({
      analysis: aiEnhancedSummary 
        ? { ...analysis, aiEnhancedSummary } 
        : analysis,
      exposure: {
        personalScore: exposure.personalScore,
        riskCategory: exposure.riskCategory,
        indoorPercent: exposure.indoorPercent,
        avgActivityLevel: exposure.avgActivityLevel,
      },
      cityAQI: aqiData,
    })
  } catch (error) {
    console.error('AI recommendation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}
