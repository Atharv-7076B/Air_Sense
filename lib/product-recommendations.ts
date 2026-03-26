// Product Recommendation Engine
// Generates product recommendations based on fuzzy logic outputs
// All product links are placeholders — marked as "Partner Recommendations"

export interface Product {
  id: string
  name: string
  brand: string
  category: 'air_purifier' | 'mask' | 'monitor' | 'supplement'
  description: string
  specs: string
  priceRange: string
  rating: number
  affiliateUrl: string
  imageUrl?: string
  roomSize?: string
  forAQI?: string
}

export interface ProductRecommendation {
  product: Product
  reason: string
  urgency: 'high' | 'medium' | 'low'
  matchScore: number // 0-100
}

// Curated product database
const PRODUCTS: Product[] = [
  // Air Purifiers
  {
    id: 'purifier-1',
    name: 'Dyson Pure Cool TP07',
    brand: 'Dyson',
    category: 'air_purifier',
    description: 'HEPA + activated carbon filter with real-time air quality display',
    specs: 'HEPA H13 filter, 290 sq ft coverage, WiFi enabled, auto mode',
    priceRange: '\u20b935,000 - \u20b942,000',
    rating: 4.5,
    affiliateUrl: '#',
    roomSize: 'Medium (200-350 sq ft)',
    forAQI: '100-300',
  },
  {
    id: 'purifier-2',
    name: 'MI Air Purifier 4',
    brand: 'Xiaomi',
    category: 'air_purifier',
    description: 'High-efficiency 3-layer filtration with app control',
    specs: 'True HEPA, 516 sq ft coverage, CADR 400 m³/h, OLED display',
    priceRange: '\u20b99,999 - \u20b912,000',
    rating: 4.3,
    affiliateUrl: '#',
    roomSize: 'Large (400-600 sq ft)',
    forAQI: '50-200',
  },
  {
    id: 'purifier-3',
    name: 'Coway Airmega 150',
    brand: 'Coway',
    category: 'air_purifier',
    description: 'Compact purifier with True HEPA and auto mode',
    specs: 'True HEPA, 214 sq ft coverage, 3 fan speeds, filter indicator',
    priceRange: '\u20b98,500 - \u20b910,000',
    rating: 4.4,
    affiliateUrl: '#',
    roomSize: 'Small (150-250 sq ft)',
    forAQI: '50-150',
  },
  {
    id: 'purifier-4',
    name: 'Blueair Blue 3210',
    brand: 'Blueair',
    category: 'air_purifier',
    description: 'Swedish design with HEPASilent technology',
    specs: 'HEPASilent, 260 sq ft, washable pre-filter, 3 speeds',
    priceRange: '\u20b912,000 - \u20b915,000',
    rating: 4.5,
    affiliateUrl: '#',
    roomSize: 'Medium (200-300 sq ft)',
    forAQI: '100-250',
  },
  {
    id: 'purifier-5',
    name: 'Honeywell Air Touch V4',
    brand: 'Honeywell',
    category: 'air_purifier',
    description: 'Medical-grade HEPA with PM2.5 sensor',
    specs: 'H13 HEPA + activated carbon, 465 sq ft, WiFi, auto mode',
    priceRange: '\u20b918,000 - \u20b922,000',
    rating: 4.2,
    affiliateUrl: '#',
    roomSize: 'Large (350-500 sq ft)',
    forAQI: '100-300',
  },

  // Masks
  {
    id: 'mask-1',
    name: '3M 9502+ N95 Respirator',
    brand: '3M',
    category: 'mask',
    description: 'NIOSH-certified N95 with adjustable nose clip',
    specs: 'N95 rated, filters 95% particles, headband style',
    priceRange: '\u20b9250 - \u20b9400 (pack of 5)',
    rating: 4.6,
    affiliateUrl: '#',
  },
  {
    id: 'mask-2',
    name: 'Venus V-4420 N95',
    brand: 'Venus Safety',
    category: 'mask',
    description: 'BIS-certified N95 mask with exhalation valve',
    specs: 'N95 rated, exhalation valve, adjustable straps',
    priceRange: '\u20b9150 - \u20b9250 (pack of 5)',
    rating: 4.3,
    affiliateUrl: '#',
  },
  {
    id: 'mask-3',
    name: 'Cambridge Mask PRO',
    brand: 'Cambridge Mask',
    category: 'mask',
    description: 'Reusable N99 mask with military-grade filtration',
    specs: 'N99 rated, adjustable ear loops, washable, replaceable filter',
    priceRange: '\u20b92,500 - \u20b93,500',
    rating: 4.4,
    affiliateUrl: '#',
  },

  // Air Quality Monitors
  {
    id: 'monitor-1',
    name: 'IQAir AirVisual Pro',
    brand: 'IQAir',
    category: 'monitor',
    description: 'Professional-grade indoor/outdoor air quality monitor',
    specs: 'PM2.5, CO2, temp, humidity sensors, 7" display, WiFi',
    priceRange: '\u20b922,000 - \u20b928,000',
    rating: 4.7,
    affiliateUrl: '#',
  },
  {
    id: 'monitor-2',
    name: 'Temtop M10',
    brand: 'Temtop',
    category: 'monitor',
    description: 'Portable PM2.5 and AQI monitor',
    specs: 'PM2.5, HCHO, TVOC, real-time AQI, rechargeable',
    priceRange: '\u20b95,000 - \u20b97,000',
    rating: 4.2,
    affiliateUrl: '#',
  },

  // Supplements
  {
    id: 'supplement-1',
    name: 'NAC (N-Acetyl Cysteine) 600mg',
    brand: 'Various',
    category: 'supplement',
    description: 'Antioxidant that supports respiratory health and detoxification',
    specs: '600mg per capsule, 60 capsules',
    priceRange: '\u20b9500 - \u20b9800',
    rating: 4.3,
    affiliateUrl: '#',
  },
  {
    id: 'supplement-2',
    name: 'Vitamin C 1000mg + Zinc',
    brand: 'Various',
    category: 'supplement',
    description: 'Immune support and antioxidant protection',
    specs: '1000mg Vitamin C + 15mg Zinc, 60 tablets',
    priceRange: '\u20b9350 - \u20b9600',
    rating: 4.4,
    affiliateUrl: '#',
  },
]

export interface RecommendationContext {
  aqi: number
  purifierUrgency?: number // 0-100 from fuzzy
  maskLevel?: number // 0-100 from fuzzy
  budget?: 'budget' | 'mid' | 'premium'
  roomSize?: 'small' | 'medium' | 'large'
}

export function getProductRecommendations(context: RecommendationContext): ProductRecommendation[] {
  const recommendations: ProductRecommendation[] = []

  // Air purifier recommendations
  if ((context.purifierUrgency && context.purifierUrgency > 30) || context.aqi > 100) {
    const purifiers = PRODUCTS.filter(p => p.category === 'air_purifier')
    const urgency = context.purifierUrgency
      ? context.purifierUrgency > 70 ? 'high' : context.purifierUrgency > 40 ? 'medium' : 'low'
      : context.aqi > 200 ? 'high' : context.aqi > 100 ? 'medium' : 'low'

    for (const purifier of purifiers) {
      let matchScore = 50

      // Match based on AQI severity
      if (context.aqi > 200 && purifier.specs.includes('H13')) matchScore += 20
      if (context.aqi > 150 && purifier.specs.includes('True HEPA')) matchScore += 15
      if (context.aqi <= 150 && !purifier.priceRange.includes('35,000')) matchScore += 10

      recommendations.push({
        product: purifier,
        reason: context.aqi > 200
          ? 'Critical AQI levels — high-performance purification essential'
          : context.aqi > 150
          ? 'Poor air quality — air purification strongly recommended'
          : 'Moderate air quality — purifier will improve indoor air',
        urgency,
        matchScore: Math.min(100, matchScore),
      })
    }
  }

  // Mask recommendations
  if ((context.maskLevel && context.maskLevel > 25) || context.aqi > 100) {
    const masks = PRODUCTS.filter(p => p.category === 'mask')
    const urgency = context.maskLevel
      ? context.maskLevel > 70 ? 'high' : context.maskLevel > 40 ? 'medium' : 'low'
      : context.aqi > 200 ? 'high' : 'medium'

    for (const mask of masks) {
      recommendations.push({
        product: mask,
        reason: context.aqi > 200
          ? 'N95 mask essential for any outdoor activity'
          : context.aqi > 150
          ? 'Mask recommended when going outdoors'
          : 'Optional mask for sensitive individuals',
        urgency,
        matchScore: mask.specs.includes('N95') ? 85 : 75,
      })
    }
  }

  // Monitor recommendations (always useful)
  if (context.aqi > 80) {
    const monitors = PRODUCTS.filter(p => p.category === 'monitor')
    for (const monitor of monitors) {
      recommendations.push({
        product: monitor,
        reason: 'Track indoor air quality for informed decisions',
        urgency: 'low',
        matchScore: 60,
      })
    }
  }

  // Supplement recommendations (for high AQI)
  if (context.aqi > 150) {
    const supplements = PRODUCTS.filter(p => p.category === 'supplement')
    for (const supplement of supplements) {
      recommendations.push({
        product: supplement,
        reason: 'Antioxidant support for pollution exposure (consult your doctor)',
        urgency: context.aqi > 250 ? 'medium' : 'low',
        matchScore: 55,
      })
    }
  }

  // Sort by match score
  recommendations.sort((a, b) => b.matchScore - a.matchScore)

  return recommendations
}

export function getTravelKit(destinationAQI: number): ProductRecommendation[] {
  const context: RecommendationContext = {
    aqi: destinationAQI,
    purifierUrgency: destinationAQI > 150 ? 80 : 40,
    maskLevel: destinationAQI > 100 ? 70 : 30,
  }

  const recs = getProductRecommendations(context)

  // For travel, prioritize portable items
  return recs.filter(r =>
    r.product.category === 'mask' ||
    r.product.category === 'monitor' ||
    r.product.category === 'supplement'
  ).slice(0, 5)
}
