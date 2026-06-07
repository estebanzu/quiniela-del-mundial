import type { Match, TeamStandings } from './types'
import { groupsData } from './groupsData'
import { DB_TEAM_TO_SPANISH } from './translations'

export function getGroupStandings(groupName: string, matchesList: Match[]): TeamStandings[] {
  const group = groupsData.find(g => g.name === groupName)
  if (!group) return []

  const standings: Record<string, TeamStandings> = {}

  group.teams.forEach(team => {
    standings[team.name] = {
      name: team.name,
      flag: team.flag,
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      gf: 0,
      gc: 0,
      gd: 0,
      pts: 0
    }
  })

  // Filter matches for this group
  const groupMatches = matchesList.filter(m => {
    const mGroup = m.stage_group || ''
    return mGroup.trim().toLowerCase() === groupName.trim().toLowerCase()
  })

  // Compute standings stats
  groupMatches.forEach(match => {
    if (match.status === 'finished' && match.home_score !== null && match.away_score !== null) {
      const homeName = DB_TEAM_TO_SPANISH[match.home_team] || match.home_team
      const awayName = DB_TEAM_TO_SPANISH[match.away_team] || match.away_team

      const homeStats = standings[homeName]
      const awayStats = standings[awayName]

      if (homeStats && awayStats) {
        homeStats.pj += 1
        awayStats.pj += 1

        homeStats.gf += match.home_score
        homeStats.gc += match.away_score
        awayStats.gf += match.away_score
        awayStats.gc += match.home_score

        if (match.home_score > match.away_score) {
          homeStats.pg += 1
          homeStats.pts += 3
          awayStats.pp += 1
        } else if (match.home_score < match.away_score) {
          awayStats.pg += 1
          awayStats.pts += 3
          homeStats.pp += 1
        } else {
          homeStats.pe += 1
          awayStats.pe += 1
          homeStats.pts += 1
          awayStats.pts += 1
        }

        homeStats.gd = homeStats.gf - homeStats.gc
        awayStats.gd = awayStats.gf - awayStats.gc
      }
    }
  })

  // Sort according to FIFA rules: points, GD, GF, alphabetical name
  return Object.values(standings).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.gd !== a.gd) return b.gd - a.gd
    if (b.gf !== a.gf) return b.gf - a.gf
    return a.name.localeCompare(b.name)
  })
}
