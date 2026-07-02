import { createClient } from '@supabase/supabase-js'

export type SyncResult = {
  success: boolean
  count: number
  message: string
}

export async function syncMatchesFromApi(): Promise<SyncResult> {
  const [liveRes, todayRes, allRes] = await Promise.all([
    fetch('https://wcup2026.org/api/data.php?action=live', { next: { revalidate: 0 } }),
    fetch('https://wcup2026.org/api/data.php?action=today', { next: { revalidate: 0 } }),
    fetch('https://wcup2026.org/api/data.php?action=all', { next: { revalidate: 0 } })
  ])

  const liveData = liveRes.ok ? await liveRes.json() : { matches: [] }
  const todayData = todayRes.ok ? await todayRes.json() : { matches: [] }
  const allData = allRes.ok ? await allRes.json() : { matches: [] }

  const apiMatchesMap = new Map<number, any>()
  const addMatches = (matches: any[]) => {
    if (!matches) return
    for (const m of matches) {
      if (m && typeof m.id === 'number') {
        apiMatchesMap.set(m.id, m)
      }
    }
  }

  addMatches(allData.matches)
  addMatches(todayData.matches)
  addMatches(liveData.matches)

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured on the server.')
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  )

  const { data: dbMatches, error: dbError } = await supabase
    .from('matches')
    .select('id, status, home_score, away_score, score_manually_set, home_team, away_team, home_penalty, away_penalty')

  if (dbError) {
    console.error('Error fetching database matches:', dbError)
    throw dbError
  }

  const normalizeApiTeamName = (name: string): string => {
    if (!name) return name
    const mapping: Record<string, string> = {
      'South Korea': 'Korea Republic',
      'Czech Republic': 'Czechia',
      'DR Congo': 'Congo DR',
      'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
      'Ivory Coast': "Côte'Ivoire",
    }
    return mapping[name] || name
  }

  const updates: any[] = []

  for (const dbMatch of dbMatches || []) {
    if (dbMatch.score_manually_set) {
      continue
    }

    // API match IDs are 0-indexed (0 to 103), while database IDs are 1-indexed (1 to 104)
    const apiMatch = apiMatchesMap.get(Number(dbMatch.id) - 1)
    if (!apiMatch) {
      continue
    }

    let apiStatusMapped = 'pending'
    const apiStatus = (apiMatch.status || '').toLowerCase()
    if (apiStatus === 'finished' || apiStatus === 'completed') {
      apiStatusMapped = 'finished'
    } else if (apiStatus === 'live' || apiStatus === 'in-progress' || apiStatus === 'playing') {
      apiStatusMapped = 'live'
    }

    const score = apiMatch.score
    const hasScore = Array.isArray(score) && score.length === 2
    const homeScoreMapped = hasScore ? score[0] : null
    const awayScoreMapped = hasScore ? score[1] : null

    if (apiStatusMapped === 'finished' && (homeScoreMapped === null || awayScoreMapped === null)) {
      continue
    }

    // Parse penalty shootout results if available
    const ps = apiMatch.ps || apiMatch.penalties
    const hasPs = Array.isArray(ps) && ps.length === 2
    const homePenaltyMapped = hasPs ? ps[0] : null
    const awayPenaltyMapped = hasPs ? ps[1] : null

    const homeTeamMapped = apiMatch.team1 ? normalizeApiTeamName(apiMatch.team1) : dbMatch.home_team
    const awayTeamMapped = apiMatch.team2 ? normalizeApiTeamName(apiMatch.team2) : dbMatch.away_team

    const teamDiff = dbMatch.home_team !== homeTeamMapped || dbMatch.away_team !== awayTeamMapped
    const statusDiff = dbMatch.status !== apiStatusMapped
    const homeDiff = dbMatch.home_score !== homeScoreMapped
    const awayDiff = dbMatch.away_score !== awayScoreMapped
    const penaltyDiff = dbMatch.home_penalty !== homePenaltyMapped || dbMatch.away_penalty !== awayPenaltyMapped

    if (teamDiff || statusDiff || homeDiff || awayDiff || penaltyDiff) {
      updates.push({
        id: dbMatch.id,
        status: apiStatusMapped,
        home_score: homeScoreMapped,
        away_score: awayScoreMapped,
        home_team: homeTeamMapped,
        away_team: awayTeamMapped,
        home_penalty: homePenaltyMapped,
        away_penalty: awayPenaltyMapped,
      })
    }
  }

  let updatedCount = 0
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        status: update.status,
        home_score: update.home_score,
        away_score: update.away_score,
        home_team: update.home_team,
        away_team: update.away_team,
        home_penalty: update.home_penalty,
        away_penalty: update.away_penalty,
      })
      .eq('id', update.id)

    if (updateError) {
      console.error(`Error updating match ${update.id}:`, updateError)
      throw updateError
    }
    updatedCount++
  }

  return {
    success: true,
    count: updatedCount,
    message: `Sincronización exitosa. Se actualizaron ${updatedCount} partidos en la base de datos.`
  }
}
