import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Global in-memory cache to throttle API calls and prevent abuse/DDoS
let lastSyncTime = 0
const THROTTLE_MS = 30000 // 30 seconds cooldown

export async function POST(request: Request) {
  try {
    // 1. Throttling check
    const now = Date.now()
    if (now - lastSyncTime < THROTTLE_MS) {
      return NextResponse.json({
        success: true,
        count: 0,
        throttled: true,
        message: `La sincronización automática está en cooldown (${Math.ceil((THROTTLE_MS - (now - lastSyncTime)) / 1000)}s restantes).`
      })
    }

    // 2. Auth verification: make sure a logged-in user is triggering the sync
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No Authorization token provided.' }, { status: 401 })
    }

    // Initialize regular client to verify user token
    const authClient = createClient(
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
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    // 3. Fetch match data from wcup2026.org (keyless CORS API)
    const [liveRes, todayRes, resultsRes] = await Promise.all([
      fetch('https://wcup2026.org/api/data.php?action=live', { next: { revalidate: 0 } }),
      fetch('https://wcup2026.org/api/data.php?action=today', { next: { revalidate: 0 } }),
      fetch('https://wcup2026.org/api/data.php?action=results', { next: { revalidate: 0 } })
    ])

    const liveData = liveRes.ok ? await liveRes.json() : { matches: [] }
    const todayData = todayRes.ok ? await todayRes.json() : { matches: [] }
    const resultsData = resultsRes.ok ? await resultsRes.json() : { matches: [] }

    // Consolidate API matches by ID (later lists take priority)
    const apiMatchesMap = new Map<number, any>()
    const addMatches = (matches: any[]) => {
      if (!matches) return
      for (const m of matches) {
        if (m && typeof m.id === 'number') {
          apiMatchesMap.set(m.id, m)
        }
      }
    }

    addMatches(resultsData.matches)
    addMatches(todayData.matches)
    addMatches(liveData.matches)

    // 4. Connect to Supabase using SERVICE ROLE KEY to bypass RLS for match updates
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )

    // Fetch existing matches in our database to compare and check manual locks
    const { data: dbMatches, error: dbError } = await supabase
      .from('matches')
      .select('id, status, home_score, away_score, score_manually_set')

    if (dbError) {
      console.error('Error fetching database matches:', dbError)
      throw dbError
    }

    const updates: any[] = []

    for (const dbMatch of dbMatches || []) {
      // Skip updates for matches manually set by the administrator
      if (dbMatch.score_manually_set) {
        continue
      }

      const apiMatch = apiMatchesMap.get(Number(dbMatch.id))
      if (!apiMatch) {
        continue
      }

      // Map API status to database-compatible state
      let apiStatusMapped = 'pending'
      const apiStatus = (apiMatch.status || '').toLowerCase()
      if (apiStatus === 'finished' || apiStatus === 'completed') {
        apiStatusMapped = 'finished'
      } else if (apiStatus === 'live' || apiStatus === 'in-progress' || apiStatus === 'playing') {
        apiStatusMapped = 'live'
      }

      // Map score goals
      const score = apiMatch.score
      const hasScore = Array.isArray(score) && score.length === 2
      const homeScoreMapped = hasScore ? score[0] : null
      const awayScoreMapped = hasScore ? score[1] : null

      // Ignore finished matches if API returns null/invalid score
      if (apiStatusMapped === 'finished' && (homeScoreMapped === null || awayScoreMapped === null)) {
        continue
      }

      // Detect differences
      const statusDiff = dbMatch.status !== apiStatusMapped
      const homeDiff = dbMatch.home_score !== homeScoreMapped
      const awayDiff = dbMatch.away_score !== awayScoreMapped

      if (statusDiff || homeDiff || awayDiff) {
        updates.push({
          id: dbMatch.id,
          status: apiStatusMapped,
          home_score: homeScoreMapped,
          away_score: awayScoreMapped,
        })
      }
    }

    // 5. Update matches table in chunks (upsert updates leaderboard trigger too)
    let updatedCount = 0
    if (updates.length > 0) {
      const chunkSize = 50
      for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize)
        const { error: upsertError } = await supabase
          .from('matches')
          .upsert(chunk, { onConflict: 'id' })

        if (upsertError) {
          console.error('Error during matches automatic upsert chunk:', upsertError)
          throw upsertError
        }
        updatedCount += chunk.length
      }
    }

    // Set the last sync timestamp on successful run
    lastSyncTime = now

    return NextResponse.json({
      success: true,
      count: updatedCount,
      throttled: false,
      message: `Sincronización exitosa. Se actualizaron ${updatedCount} partidos en la base de datos.`
    })
  } catch (err: any) {
    console.error('Sync error caught in API route:', err)
    return NextResponse.json({ error: err.message || 'Error syncing matches.' }, { status: 500 })
  }
}
