import * as fs from 'fs'
import * as path from 'path'

const MONTH_MAP: Record<string, string> = {
  January: '01',
  February: '02',
  March: '03',
  April: '04',
  May: '05',
  June: '06',
  July: '07',
  August: '08',
  September: '09',
  October: '10',
  November: '11',
  December: '12'
}

interface ParsedMatch {
  id?: number
  home_team: string
  away_team: string
  group: string
  venue: string
  match_date: string
  status: 'pending' | 'finished'
  home_score: number | null
  away_score: number | null
}

function parseFixtures() {
  const filePath = path.resolve(__dirname, '../phase01.txt')
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`)
    process.exit(1)
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  let currentDateStr: string | null = null
  let matchesByDate: Record<string, Array<{ home: string, away: string, group: string, venue: string }>> = {}
  let dateOrder: string[] = []

  // Regex to match dates, e.g., "Thursday, 11 June 2026"
  const dateRegex = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\d+)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i

  for (let line of lines) {
    line = line.trim()
    if (!line || line.startsWith('FIFA World Cup')) {
      continue
    }

    const dateMatch = line.match(dateRegex)
    if (dateMatch) {
      const day = dateMatch[2]
      const monthStr = dateMatch[3]
      const year = dateMatch[4]
      const month = MONTH_MAP[monthStr]
      currentDateStr = `${year}-${month}-${day.padStart(2, '0')}`
      if (!matchesByDate[currentDateStr]) {
        matchesByDate[currentDateStr] = []
        dateOrder.push(currentDateStr)
      }
      continue
    }

    if (line.includes(' v ') || line.includes(' V ')) {
      if (!currentDateStr) {
        console.warn(`Warning: Match line found before any date: "${line}"`)
        continue
      }

      // Split line using dashes/hyphens
      const parts = line.split(/\s*[-–—]\s*/)
      if (parts.length < 2) {
        console.warn(`Warning: Could not split match line: "${line}"`)
        continue
      }

      // Extract home and away teams
      const teamsPart = parts[0]
      const teamSplit = teamsPart.split(/\s+[vV]\s+/)
      if (teamSplit.length < 2) {
        console.warn(`Warning: Could not parse teams from "${teamsPart}"`)
        continue
      }
      const home = teamSplit[0].trim()
      const away = teamSplit[1].trim()

      // Classify Group and Venue
      let group = 'Group Stage'
      let venue = 'Stadium'
      if (parts[1] && parts[1].includes('Group')) {
        group = parts[1].trim()
        if (parts[2]) venue = parts[2].trim()
      } else if (parts[2] && parts[2].includes('Group')) {
        group = parts[2].trim()
        if (parts[1]) venue = parts[1].trim()
      } else {
        if (parts[1]) group = parts[1].trim()
        if (parts[2]) venue = parts[2].trim()
      }

      matchesByDate[currentDateStr].push({ home, away, group, venue })
    }
  }

  // Build final matches array with staggered times
  const finalMatches: ParsedMatch[] = []
  let matchId = 100 // Starting from 100 to avoid overlapping with any demo matches, though we will clear DB anyway

  for (const dateStr of dateOrder) {
    const list = matchesByDate[dateStr]
    const total = list.length

    list.forEach((m, idx) => {
      let hour = 18
      if (total === 2) {
        hour = idx === 0 ? 18 : 22
      } else if (total === 4) {
        const hours = [15, 18, 21, 0]
        hour = hours[idx] ?? 18
      } else if (total === 6) {
        const hours = [14, 16, 18, 20, 22, 0]
        hour = hours[idx] ?? 18
      } else {
        hour = 12 + idx * 2
      }

      let finalDateStr = `${dateStr}T${hour.toString().padStart(2, '0')}:00:00Z`
      
      // Handle day overflow for hour=0 (meaning midnight UTC, next day kickoff)
      if (hour === 0) {
        const dateObj = new Date(`${dateStr}T00:00:00Z`)
        dateObj.setUTCDate(dateObj.getUTCDate() + 1)
        finalDateStr = dateObj.toISOString().replace('.000Z', 'Z')
      }

      finalMatches.push({
        id: matchId++,
        home_team: m.home,
        away_team: m.away,
        group: m.group,
        venue: m.venue,
        match_date: finalDateStr,
        status: 'pending',
        home_score: null,
        away_score: null
      })
    })
  }

  const outputPath = path.resolve(__dirname, 'matches_phase1.json')
  fs.writeFileSync(outputPath, JSON.stringify(finalMatches, null, 2), 'utf-8')
  console.log(`Successfully parsed ${finalMatches.length} matches and saved to ${outputPath}`)
}

parseFixtures()
