import * as fs from 'fs'
import * as path from 'path'

const MONTH_MAP: Record<string, string> = {
  // English Months
  January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
  July: '07', August: '08', September: '09', October: '10', November: '11', December: '12',
  // Spanish Months
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
}

interface ParsedMatch {
  id: number
  home_team: string
  away_team: string
  group: string
  venue: string
  match_date: string
  status: 'pending' | 'finished'
  home_score: number | null
  away_score: number | null
}

interface TempMatch {
  id?: number
  home: string
  away: string
  group: string
  venue: string
  dateStr: string
}

function parseAllPhases() {
  const matchesByDate: Record<string, TempMatch[]> = {}
  const dateOrder: string[] = []
  
  // Regex patterns
  const englishDateRegex = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\d+)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i
  const spanishDateRegex = /^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo),\s+(\d+)\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{4})/i

  // 1. Process Phase 1 (Group Stage)
  console.log('Parsing phase01.txt...')
  const phase1Path = path.resolve(__dirname, '../phase01.txt')
  if (fs.existsSync(phase1Path)) {
    const content = fs.readFileSync(phase1Path, 'utf-8')
    const lines = content.split('\n')
    let currentDateStr: string | null = null

    for (let line of lines) {
      line = line.trim()
      if (!line || line.startsWith('FIFA World Cup')) continue

      const dateMatch = line.match(englishDateRegex)
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
        if (!currentDateStr) continue

        const parts = line.split(/\s*[-–—]\s*/)
        if (parts.length < 2) continue

        const teamsPart = parts[0]
        const teamSplit = teamsPart.split(/\s+[vV]\s+/)
        if (teamSplit.length < 2) continue

        const home = teamSplit[0].trim()
        const away = teamSplit[1].trim()

        let group = 'Fase de Grupos'
        let venue = 'Estadio'
        if (parts[1] && parts[1].includes('Group')) {
          group = parts[1].replace('Group', 'Grupo').trim()
          if (parts[2]) venue = parts[2].trim()
        } else if (parts[2] && parts[2].includes('Group')) {
          group = parts[2].replace('Group', 'Grupo').trim()
          if (parts[1]) venue = parts[1].trim()
        } else {
          if (parts[1]) group = parts[1].trim()
          if (parts[2]) venue = parts[2].trim()
        }

        matchesByDate[currentDateStr].push({ home, away, group, venue, dateStr: currentDateStr })
      }
    }
  }

  // Helper for knockout stages files
  const parseKnockoutPhase = (filename: string, stageName: string) => {
    console.log(`Parsing ${filename}...`)
    const filePath = path.resolve(__dirname, `../${filename}`)
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: File ${filename} not found. Skipping.`)
      return
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    let currentDateStr: string | null = null

    for (let line of lines) {
      line = line.trim()
      if (!line || line.startsWith('Copa Mundial')) continue

      const dateMatch = line.match(spanishDateRegex)
      if (dateMatch) {
        const day = dateMatch[2]
        const monthStr = dateMatch[3].toLowerCase()
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
        if (!currentDateStr) continue

        const parts = line.split(/\s*[-–—]\s*/)
        if (parts.length < 3) {
          // If split is less than 3, might be format "Partido XX – Team A v Team B - Venue"
          // Let's try splitting by the en-dash first to isolate match ID, then split the rest by hyphen
          const partsDash = line.split(/\s*[–]\s*/)
          if (partsDash.length >= 2) {
            const matchIdPart = partsDash[0]
            const rest = partsDash[1]
            const partsHyphen = rest.split(/\s*[-]\s*/)
            if (partsHyphen.length >= 2) {
              const matchId = parseInt(matchIdPart.replace(/\D/g, ''))
              const matchup = partsHyphen[0]
              const venue = partsHyphen[1]
              const teamSplit = matchup.split(/\s+[vV]\s+/)
              if (teamSplit.length >= 2) {
                const home = teamSplit[0].trim()
                const away = teamSplit[1].trim()
                matchesByDate[currentDateStr].push({
                  id: matchId,
                  home,
                  away,
                  group: stageName,
                  venue: venue.trim(),
                  dateStr: currentDateStr
                })
                continue
              }
            }
          }
          console.warn(`Warning: Could not parse knockout line: "${line}"`)
          continue
        }

        const matchIdPart = parts[0]
        const matchId = parseInt(matchIdPart.replace(/\D/g, ''))
        const matchup = parts[1]
        const venue = parts[2]

        const teamSplit = matchup.split(/\s+[vV]\s+/)
        if (teamSplit.length < 2) continue

        const home = teamSplit[0].trim()
        const away = teamSplit[1].trim()

        matchesByDate[currentDateStr].push({
          id: matchId,
          home,
          away,
          group: stageName,
          venue: venue.trim(),
          dateStr: currentDateStr
        })
      }
    }
  }

  // Parse files 2 to 6
  parseKnockoutPhase('phase02.txt', 'Dieciseisavos de final')
  parseKnockoutPhase('phase03.txt', 'Octavos de final')
  parseKnockoutPhase('phase04.txt', 'Cuartos de final')
  parseKnockoutPhase('phase05.txt', 'Semifinales')
  
  // Phase 06 contains both Third Place match and Final, so we pass a generic label
  // but we can refine it inside the helper by checking headers if needed,
  // or simply label them as "Finales" or customize based on match ID:
  // Match 103 = Tercer Puesto, Match 104 = Final
  console.log('Parsing phase06.txt...')
  const phase6Path = path.resolve(__dirname, '../phase06.txt')
  if (fs.existsSync(phase6Path)) {
    const content = fs.readFileSync(phase6Path, 'utf-8')
    const lines = content.split('\n')
    let currentDateStr: string | null = null
    let currentStage = 'Finales'

    for (let line of lines) {
      line = line.trim()
      if (!line) continue
      if (line.includes('tercer puesto')) {
        currentStage = 'Tercer Puesto'
        continue
      }
      if (line.includes('Final')) {
        currentStage = 'Final'
        continue
      }

      const dateMatch = line.match(spanishDateRegex)
      if (dateMatch) {
        const day = dateMatch[2]
        const monthStr = dateMatch[3].toLowerCase()
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
        if (!currentDateStr) continue
        const parts = line.split(/\s*[-–—]\s*/)
        if (parts.length < 3) continue

        const matchIdPart = parts[0]
        const matchId = parseInt(matchIdPart.replace(/\D/g, ''))
        const matchup = parts[1]
        const venue = parts[2]

        const teamSplit = matchup.split(/\s+[vV]\s+/)
        if (teamSplit.length < 2) continue

        const home = teamSplit[0].trim()
        const away = teamSplit[1].trim()

        matchesByDate[currentDateStr].push({
          id: matchId,
          home,
          away,
          group: currentStage,
          venue: venue.trim(),
          dateStr: currentDateStr
        })
      }
    }
  }

  // 3. Stagger kickoff hours and build final matches array
  const finalMatches: ParsedMatch[] = []
  let groupMatchIdCounter = 1 // Starting group matches at 1, knockout matches already have explicit IDs from text

  for (const dateStr of dateOrder) {
    const list = matchesByDate[dateStr]
    const total = list.length

    list.forEach((m, idx) => {
      let hour = 18
      if (total === 1) {
        hour = 21
      } else if (total === 2) {
        hour = idx === 0 ? 18 : 21
      } else if (total === 3) {
        const hours = [16, 19, 22]
        hour = hours[idx] ?? 18
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

      // Assign id
      // If it's a knockout match, it has an ID already parsed. If it's phase 1, it doesn't.
      const assignedId = m.id !== undefined ? m.id : groupMatchIdCounter++

      finalMatches.push({
        id: assignedId,
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

  // Sort matches by ID
  finalMatches.sort((a, b) => a.id - b.id)

  const outputPath = path.resolve(__dirname, 'matches_all_phases.json')
  fs.writeFileSync(outputPath, JSON.stringify(finalMatches, null, 2), 'utf-8')
  console.log(`Successfully parsed ${finalMatches.length} matches and saved to ${outputPath}`)

  // Generate SQL seed file for Supabase
  const sqlOutputPath = path.resolve(__dirname, 'seed_matches.sql')
  const sqlStatements = finalMatches.map(m => {
    const home = m.home_team.replace(/'/g, "''")
    const away = m.away_team.replace(/'/g, "''")
    const group = m.group.replace(/'/g, "''")
    const venue = m.venue.replace(/'/g, "''")
    return `INSERT INTO public.matches (id, home_team, away_team, stage_group, venue, match_date, status) VALUES (${m.id}, '${home}', '${away}', '${group}', '${venue}', '${m.match_date}', 'pending') ON CONFLICT (id) DO UPDATE SET home_team = EXCLUDED.home_team, away_team = EXCLUDED.away_team, stage_group = EXCLUDED.stage_group, venue = EXCLUDED.venue, match_date = EXCLUDED.match_date;`
  })
  
  fs.writeFileSync(sqlOutputPath, sqlStatements.join('\n'), 'utf-8')
  console.log(`Successfully generated SQL seed file at ${sqlOutputPath}`)
}

parseAllPhases()
