export type Match = {
  id: number
  home_team: string
  away_team: string
  match_date: string
  stage_group?: string
  venue?: string
  home_score: number | null
  away_score: number | null
  status: 'pending' | 'finished'
}

export type Prediction = {
  id: number
  user_id: string
  match_id: number
  predicted_home: number
  predicted_away: number
  points: number
  created_at: string
}

export type TeamStandings = {
  name: string
  flag: string
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  gd: number
  pts: number
}

export type MatchComment = {
  id: number
  match_id: number
  user_id: string
  username: string
  comment: string
  created_at: string
}
