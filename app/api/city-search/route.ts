import { NextResponse } from 'next/server'
import { searchCities } from '@/lib/city-search'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const limit = parseInt(searchParams.get('limit') || '5', 10)

  if (query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await searchCities(query, Math.min(limit, 10))
    return NextResponse.json({ results })
  } catch (error) {
    console.error('City search error:', error)
    return NextResponse.json(
      { error: 'Failed to search cities', results: [] },
      { status: 500 }
    )
  }
}
