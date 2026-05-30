import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const apiKey = process.env.FOOTBALL_DATA_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'FOOTBALL_DATA_API_KEY is not configured.' }, { status: 500 })
    }

    // Get Auth token from client request to insert on their behalf (honoring RLS)
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No Authorization token provided.' }, { status: 401 })
    }

    // Query external football-data.org API for FIFA World Cup matches (WC)
    const apiResponse = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: {
        'X-Auth-Token': apiKey,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 },
    })

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      console.error('External API fetch failed:', apiResponse.status, errorText)
      return NextResponse.json(
        { error: `External API error: ${apiResponse.status} ${apiResponse.statusText}`, details: errorText },
        { status: apiResponse.status }
      )
    }

    const apiData = await apiResponse.json()
    const rawMatches = apiData.matches || []

    if (rawMatches.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No matches found in the World Cup API.' })
    }

    // Initialize Supabase Client with the user's Auth headers
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Map external api columns to our PostgreSQL matches table schema
    const mappedMatches = rawMatches.map((m: any) => ({
      id: m.id,
      home_team: m.homeTeam.name,
      away_team: m.awayTeam.name,
      match_date: m.utcDate,
      home_score: m.score.fullTime.home,
      away_score: m.score.fullTime.away,
      status: m.status === 'FINISHED' ? 'finished' : 'pending',
    }))

    // Upsert matches in chunks of 50 to avoid any database payload or timeout limitations
    const chunkSize = 50
    let insertedCount = 0

    for (let i = 0; i < mappedMatches.length; i += chunkSize) {
      const chunk = mappedMatches.slice(i, i + chunkSize)
      const { error: upsertError } = await supabase
        .from('matches')
        .upsert(chunk, { onConflict: 'id' })

      if (upsertError) {
        console.error('Error during matches upsert chunk:', upsertError)
        throw upsertError
      }
      insertedCount += chunk.length
    }

    return NextResponse.json({ success: true, count: insertedCount })
  } catch (err: any) {
    console.error('Sync error caught in API route:', err)
    return NextResponse.json({ error: err.message || 'Error syncing matches.' }, { status: 500 })
  }
}
