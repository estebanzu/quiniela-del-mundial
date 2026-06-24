'use client'

import React, { useState, useEffect } from 'react'
import type { Match, Prediction } from '../lib/types'
import { supabase } from '../lib/supabase'
import { tTeam } from '../lib/translations'

interface PredictionsMatrixProps {
  matches: Match[]
  leaderboard: { username: string; total_points: number; predictions_count: number }[]
  currentUserId: string | null
  currentUsername: string
  userProfileIds: Record<string, string>
}

export function PredictionsMatrix({
  matches,
  leaderboard,
  currentUserId,
  currentUsername,
  userProfileIds,
}: PredictionsMatrixProps) {
  const [allPredictions, setAllPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhase, setSelectedPhase] = useState<string>('todos')
  const [selectedStatus, setSelectedStatus] = useState<'todos' | 'finalizados' | 'pendientes'>('todos')

  useEffect(() => {
    async function fetchAllPredictions() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('predictions')
          .select('id, user_id, match_id, predicted_home, predicted_away, points, created_at')
        
        if (error) throw error
        if (data) {
          setAllPredictions(data as Prediction[])
        }
      } catch (err) {
        console.error('Error fetching all predictions:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAllPredictions()
  }, [matches])

  // Map predictions for quick O(1) lookup: user_id -> match_id -> prediction
  const predictionLookup = React.useMemo(() => {
    const map: Record<string, Record<number, Prediction>> = {}
    allPredictions.forEach((pred) => {
      if (!map[pred.user_id]) {
        map[pred.user_id] = {}
      }
      map[pred.user_id][pred.match_id] = pred
    })
    return map
  }, [allPredictions])

  // Filter matches based on user selections
  const filteredMatches = React.useMemo(() => {
    return matches
      .filter((match) => {
        // Status filter
        if (selectedStatus === 'finalizados' && match.status !== 'finished') return false
        if (selectedStatus === 'pendientes' && match.status === 'finished') return false

        // Phase filter
        if (selectedPhase !== 'todos') {
          const id = match.id
          if (selectedPhase === 'f1' && (id < 1 || id > 72)) return false
          if (selectedPhase === 'f2' && (id < 73 || id > 88)) return false
          if (selectedPhase === 'f3' && (id < 89 || id > 96)) return false
          if (selectedPhase === 'f4' && (id < 97 || id > 100)) return false
          if (selectedPhase === 'f5' && (id < 101 || id > 102)) return false
          if (selectedPhase === 'f6' && (id < 103 || id > 104)) return false
        }
        return true
      })
      .sort((a, b) => {
        // Sort finished first, then by date/id
        if (a.status === 'finished' && b.status !== 'finished') return -1
        if (a.status !== 'finished' && b.status === 'finished') return 1
        return new Date(a.match_date).getTime() - new Date(b.match_date).getTime() || a.id - b.id
      })
  }, [matches, selectedPhase, selectedStatus])

  // Get Phase label for badge
  const getPhaseBadge = (id: number) => {
    if (id >= 1 && id <= 72) return 'Grupos'
    if (id >= 73 && id <= 88) return '16avos'
    if (id >= 89 && id <= 96) return 'Octavos'
    if (id >= 97 && id <= 100) return 'Cuartos'
    if (id >= 101 && id <= 102) return 'Semis'
    if (id >= 103 && id <= 104) return 'Finales'
    return 'Mundial'
  }

  return (
    <div className="glass-card p-4 sm:p-6 mb-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            📊 Matriz de Pronósticos
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Resultados y puntos obtenidos por todos los usuarios en cada partido.
          </p>
        </div>

        {/* Filters Grid */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedPhase}
            onChange={(e) => setSelectedPhase(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition cursor-pointer"
          >
            <option value="todos">Todas las Fases</option>
            <option value="f1">Fase 1 (Grupos)</option>
            <option value="f2">Fase 2 (16avos)</option>
            <option value="f3">Fase 3 (Octavos)</option>
            <option value="f4">Fase 4 (Cuartos)</option>
            <option value="f5">Fase 5 (Semis)</option>
            <option value="f6">Fase 6 (Finales)</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition cursor-pointer"
          >
            <option value="todos">Todos los Estados</option>
            <option value="finalizados">Solo Finalizados</option>
            <option value="pendientes">Pendientes / En Vivo</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 font-semibold flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Cargando pronósticos...
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="py-12 text-center text-slate-500 font-semibold">
          No hay partidos que coincidan con los filtros seleccionados.
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-900 rounded-2xl bg-slate-950/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 sm:px-4 font-black">Partido</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap min-w-[70px]">Real</th>
                  {leaderboard.map((user) => {
                    const isSelf = user.username.toLowerCase() === currentUsername.toLowerCase()
                    return (
                      <th
                        key={user.username}
                        className={`py-3 px-3 text-center min-w-[100px] border-l border-slate-900 ${
                          isSelf ? 'text-amber-400 font-black bg-amber-500/5' : 'font-semibold'
                        }`}
                      >
                        {user.username}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredMatches.map((match) => {
                  const isFinished = match.status === 'finished'
                  const isLive = match.status === 'live'
                  const matchDate = new Date(match.match_date)
                  // Lock prediction if finished, live, or within 5 mins of kickoff
                  const isLocked = isFinished || isLive || (matchDate.getTime() - Date.now() < 5 * 60 * 1000)

                  return (
                    <tr key={match.id} className="hover:bg-slate-900/10 transition-colors">
                      {/* Match Details */}
                      <td className="py-3.5 px-3 sm:px-4">
                        <div className="flex flex-col gap-0.5 min-w-[150px] sm:min-w-[180px]">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 tracking-wider">
                              #{match.id} {getPhaseBadge(match.id)}
                            </span>
                            {isLive && (
                              <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse">
                                En Vivo
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-slate-200 mt-1">
                            {tTeam(match.home_team)} vs {tTeam(match.away_team)}
                          </div>
                        </div>
                      </td>

                      {/* Actual Result */}
                      <td className="py-3.5 px-2 text-center whitespace-nowrap">
                        {isFinished || isLive ? (
                          <span className="inline-block px-2.5 py-1 rounded bg-slate-800 text-white font-mono font-bold text-xs">
                            {match.home_score} - {match.away_score}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-semibold text-xs">—</span>
                        )}
                      </td>

                      {/* Predictions per user */}
                      {leaderboard.map((user) => {
                        const targetUserId = userProfileIds[user.username.toLowerCase()]
                        const isSelf = user.username.toLowerCase() === currentUsername.toLowerCase()
                        
                        const pred = targetUserId ? predictionLookup[targetUserId]?.[match.id] : undefined
                        
                        let cellContent = <span className="text-slate-600 font-semibold">—</span>
                        let styleClass = ''

                        if (pred) {
                          const showPrediction = isSelf || isLocked

                          if (showPrediction) {
                            const isExact = isFinished && match.home_score === pred.predicted_home && match.away_score === pred.predicted_away
                            const pointsEarned = pred.points || 0

                            cellContent = (
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <span className="font-mono font-bold text-slate-100">
                                  {pred.predicted_home} - {pred.predicted_away}
                                </span>
                                {isFinished && (
                                  <span
                                    className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${
                                      isExact
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                        : pointsEarned > 0
                                        ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                                        : 'bg-slate-900 border-slate-800 text-slate-500'
                                    }`}
                                  >
                                    +{pointsEarned} pts
                                  </span>
                                )}
                              </div>
                            )
                          } else {
                            cellContent = (
                              <span className="text-[10px] uppercase font-bold text-slate-500/60 flex items-center justify-center gap-1">
                                🔒 Oculto
                              </span>
                            )
                          }
                        }

                        return (
                          <td
                            key={user.username}
                            className={`py-3.5 px-3 text-center border-l border-slate-900 ${
                              isSelf ? 'bg-amber-500/5' : ''
                            }`}
                          >
                            {cellContent}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
