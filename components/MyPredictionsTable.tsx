'use client'

import React, { useState } from 'react'
import type { Match, Prediction } from '../lib/types'
import { tTeam } from '../lib/translations'

interface MyPredictionsTableProps {
  matches: Match[]
  predictions: Record<number, Prediction>
}

export function MyPredictionsTable({
  matches,
  predictions,
}: MyPredictionsTableProps) {
  const [selectedPhase, setSelectedPhase] = useState<string>('todos')
  const [selectedStatus, setSelectedStatus] = useState<'todos' | 'finalizados' | 'pendientes'>('todos')

  // Filter matches based on selections
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            📋 Historial de Pronósticos y Resultados
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Compara tus pronósticos con los marcadores reales y revisa tus puntos ganados.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
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

      {filteredMatches.length === 0 ? (
        <div className="py-12 text-center text-slate-500 font-semibold">
          No hay partidos que coincidan con los filtros seleccionados.
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-900 rounded-2xl bg-slate-950/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4 font-black">Partido</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[100px]">Resultado Real</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[100px]">Tu Pronóstico</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[90px]">Puntos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredMatches.map((match) => {
                  const isFinished = match.status === 'finished'
                  const isLive = match.status === 'live'
                  const pred = predictions[match.id]

                  let matchResultEl = <span className="text-slate-500 font-semibold">—</span>
                  if (isFinished || isLive) {
                    matchResultEl = (
                      <span className="inline-block px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono font-bold text-xs">
                        {match.home_score} - {match.away_score}
                      </span>
                    )
                  }

                  let predictionEl = <span className="text-slate-600 italic">Sin pronóstico</span>
                  let pointsEl = <span className="text-slate-500 font-semibold">—</span>

                  if (pred) {
                    predictionEl = (
                      <span className="inline-block px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-100 font-mono font-bold text-xs">
                        {pred.predicted_home} - {pred.predicted_away}
                      </span>
                    )

                    if (isFinished) {
                      const isExact = match.home_score === pred.predicted_home && match.away_score === pred.predicted_away
                      const pointsEarned = pred.points || 0
                      
                      pointsEl = (
                        <span
                          className={`inline-block text-[10px] font-black px-2.5 py-1 rounded border uppercase tracking-wider ${
                            isExact
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : pointsEarned > 0
                              ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                              : 'bg-slate-900 border-slate-800 text-slate-500'
                          }`}
                        >
                          +{pointsEarned} pts
                        </span>
                      )
                    }
                  }

                  return (
                    <tr key={match.id} className="hover:bg-slate-900/10 transition-colors">
                      {/* Match Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
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
                      <td className="py-3.5 px-4 text-center">
                        {matchResultEl}
                      </td>

                      {/* User's Prediction */}
                      <td className="py-3.5 px-4 text-center">
                        {predictionEl}
                      </td>

                      {/* Points Won */}
                      <td className="py-3.5 px-4 text-center">
                        {pointsEl}
                      </td>
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
