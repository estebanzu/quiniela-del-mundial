'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Match, Prediction } from '../lib/types'
import { tTeam } from '../lib/translations'

function getPointsBadge(prediction: Prediction | undefined, isFinished: boolean) {
  if (!isFinished || !prediction) return null
  const pts = prediction.points || 0
  if (pts === 5) {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
        🎯 +5 PTS
      </span>
    )
  }
  if (pts === 3) {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        ⚽ +3 PTS
      </span>
    )
  }
  if (pts === 1) {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-teal-500/20 text-teal-400 border border-teal-500/30">
        🤝 +1 PTS
      </span>
    )
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-500 border border-slate-700">
      ❌ +0 PTS
    </span>
  )
}

export function MatchCard({
  userId,
  match,
  prediction,
  onSave,
  isAdmin = false,
  adminMode = false,
  onMatchUpdate,
  onOpenChat,
}: {
  userId: string
  match: Match
  prediction?: Prediction
  onSave: (prediction: Prediction) => Promise<void>
  isAdmin?: boolean
  adminMode?: boolean
  onMatchUpdate?: (match: Match) => Promise<void>
  onOpenChat: (chatMeta: { id: number; homeTeam: string; awayTeam: string }) => void
}) {
  const [homeScore, setHomeScore] = useState(prediction?.predicted_home?.toString() ?? '')
  const [awayScore, setAwayScore] = useState(prediction?.predicted_away?.toString() ?? '')

  // Admin inputs state
  const [adminHomeScore, setAdminHomeScore] = useState(match.home_score?.toString() ?? '')
  const [adminAwayScore, setAdminAwayScore] = useState(match.away_score?.toString() ?? '')
  const [adminStatus, setAdminStatus] = useState<Match['status']>(match.status)

  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' | '' }>({ text: '', type: '' })

  const [commentCount, setCommentCount] = useState(0)

  // Fetch initial comment count
  useEffect(() => {
    const fetchCommentCount = async () => {
      try {
        const { count, error } = await supabase
          .from('match_comments')
          .select('*', { count: 'exact', head: true })
          .eq('match_id', match.id)
        if (!error && count !== null) {
          setCommentCount(count)
        }
      } catch (err) {
        console.error('Error fetching comment count:', err)
      }
    }
    fetchCommentCount()
  }, [match.id])

  // Synchronize state if database prediction changes
  useEffect(() => {
    if (prediction) {
      setHomeScore(prediction.predicted_home.toString())
      setAwayScore(prediction.predicted_away.toString())
    }
  }, [prediction])

  // Synchronize admin states if match data changes
  useEffect(() => {
    setAdminHomeScore(match.home_score?.toString() ?? '')
    setAdminAwayScore(match.away_score?.toString() ?? '')
    setAdminStatus(match.status)
  }, [match])

  const matchDate = new Date(match.match_date)
  const isFinished = match.status === 'finished'
  // locked if less than 5 minutes away or finished
  const isLocked = isFinished || (matchDate.getTime() - Date.now() < 5 * 60 * 1000)

  const formattedDate = matchDate.toLocaleString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Format date helper to bypass server rendering timezone shifts
  const [displayDate, setDisplayDate] = useState('')
  useEffect(() => {
    setDisplayDate(formattedDate)
  }, [formattedDate])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isLocked) return

    setSaving(true)
    setStatusMsg({ text: '', type: '' })

    const predictedHome = parseInt(homeScore)
    const predictedAway = parseInt(awayScore)

    if (isNaN(predictedHome) || isNaN(predictedAway) || predictedHome < 0 || predictedAway < 0) {
      setStatusMsg({ text: 'Ingresa goles válidos.', type: 'error' })
      setSaving(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('predictions')
        .upsert(
          {
            user_id: userId,
            match_id: match.id,
            predicted_home: predictedHome,
            predicted_away: predictedAway,
          },
          { onConflict: 'user_id,match_id' }
        )
        .select()

      if (error) throw error

      if (data && data[0]) {
        setStatusMsg({ text: '¡Pronóstico guardado!', type: 'success' })
        await onSave(data[0] as Prediction)
        // Clear message after 3 seconds
        setTimeout(() => setStatusMsg({ text: '', type: '' }), 3000)
      }
    } catch (err: any) {
      console.error(err)
      setStatusMsg({ text: err.message || 'Error al guardar.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleAdminSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setStatusMsg({ text: '', type: '' })

    const homeG = adminHomeScore === '' ? null : parseInt(adminHomeScore)
    const awayG = adminAwayScore === '' ? null : parseInt(adminAwayScore)

    if (adminStatus === 'finished' && (homeG === null || awayG === null || isNaN(homeG) || isNaN(awayG))) {
      setStatusMsg({ text: 'Los partidos finalizados deben tener goles oficiales.', type: 'error' })
      setSaving(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('matches')
        .update({
          home_score: homeG,
          away_score: awayG,
          status: adminStatus,
        })
        .eq('id', match.id)
        .select()

      if (error) throw error

      if (data && data[0]) {
        setStatusMsg({ text: '¡Resultado oficial guardado!', type: 'success' })
        if (onMatchUpdate) {
          await onMatchUpdate(data[0] as Match)
        }
        setTimeout(() => setStatusMsg({ text: '', type: '' }), 3000)
      }
    } catch (err: any) {
      console.error(err)
      setStatusMsg({ text: err.message || 'Error al guardar resultado.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={adminMode ? handleAdminSave : handleSave}
      className={`relative overflow-hidden rounded-3xl p-5 shadow-lg border transition-all duration-300 ${
        adminMode
          ? 'bg-slate-900/40 border-amber-500/30 shadow-amber-950/5'
          : isFinished
          ? 'bg-slate-900/20 border-slate-900'
          : isLocked
          ? 'bg-slate-900/30 border-slate-850'
          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-750/80 shadow-primary/5'
      }`}
    >
      {saving && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[4px] z-10 flex flex-col justify-between p-5 animate-pulse select-none">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center mb-4">
            <div className="h-3 w-28 bg-slate-800 rounded-md"></div>
            <div className="h-5 w-16 bg-slate-800 rounded-full"></div>
          </div>
          {/* Matchup Skeleton */}
          <div className="flex items-center justify-center gap-4 my-auto w-full">
            <div className="h-4 w-20 bg-slate-800 rounded-md ml-auto"></div>
            <div className="flex items-center gap-2">
              <div className="h-12 w-12 bg-slate-800 rounded-xl"></div>
              <div className="h-3 w-4 bg-slate-800 rounded-sm"></div>
              <div className="h-12 w-12 bg-slate-800 rounded-xl"></div>
            </div>
            <div className="h-4 w-20 bg-slate-800 rounded-md mr-auto"></div>
          </div>
          {/* Button Skeleton */}
          <div className="flex gap-2 mt-4">
            {!adminMode && !isLocked && <div className="h-12 w-12 bg-slate-800 rounded-xl"></div>}
            <div className="h-12 flex-1 bg-slate-800 rounded-xl"></div>
          </div>
        </div>
      )}
      {/* Top Meta info row */}
      <div className="flex justify-between items-center gap-4 mb-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-slate-400">
            📅 {displayDate || 'Cargando fecha...'}
          </span>
          {(match.stage_group || match.venue) && (
            <span className="text-[10px] text-slate-500 font-medium">
              {match.stage_group && <span>{match.stage_group}</span>}
              {match.stage_group && match.venue && <span> • </span>}
              {match.venue && <span>📍 {match.venue}</span>}
            </span>
          )}
        </div>

        {/* Lock / Status Icon Indicator */}
        <div className="flex items-center gap-2">
          {adminMode ? (
            <div className="flex items-center gap-2 select-none">
              <span className="text-[10px] uppercase font-bold text-amber-400">Resultado:</span>
              <select
                value={adminStatus}
                onChange={(e) => setAdminStatus(e.target.value as Match['status'])}
                className="bg-slate-950 text-white border border-slate-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl outline-none focus:border-amber-550 transition duration-150 cursor-pointer"
              >
                <option value="pending">Pendiente ⏳</option>
                <option value="finished">Finalizado ✅</option>
              </select>
            </div>
          ) : (
            <>
              {getPointsBadge(prediction, isFinished)}
              {isFinished ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] uppercase font-black tracking-wider bg-slate-900 border border-slate-800 text-slate-400">
                  Finalizado
                </span>
              ) : isLocked ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-accent/10 text-accent border border-accent/20">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                  Cerrado
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-primary/10 text-primary border border-primary/20">
                  <svg className="w-3 h-3 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                  </svg>
                  Abierto
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Teams Matchup Layout */}
      <div className="flex flex-col items-center gap-4">

        {/* Teams and Score inputs container */}
        <div className="w-full flex items-center justify-center gap-2 sm:gap-4 select-none">

          {/* Home Team */}
          <div className="flex-1 text-right pr-2 min-w-0">
            <span className="text-xs sm:text-base font-extrabold text-slate-100 break-words leading-tight block">
              {tTeam(match.home_team)}
            </span>
          </div>

          {/* Goal Inputs block */}
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="number"
              min="0"
              value={adminMode ? adminHomeScore : homeScore}
              disabled={adminMode ? saving : isLocked || saving}
              onChange={(e) => adminMode ? setAdminHomeScore(e.target.value) : setHomeScore(e.target.value)}
              className={`w-12 h-12 rounded-xl text-center font-black text-lg outline-none transition ${
                adminMode
                  ? 'bg-slate-950 text-amber-400 border border-amber-800/60 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30'
                  : isLocked
                  ? 'bg-slate-950/60 text-slate-500 border border-slate-900 cursor-not-allowed'
                  : 'bg-slate-950 text-white border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/30'
              }`}
              placeholder="-"
              aria-label={`Goles de ${match.home_team}`}
            />
            <span className="text-slate-650 font-bold text-sm">vs</span>
            <input
              type="number"
              min="0"
              value={adminMode ? adminAwayScore : awayScore}
              disabled={adminMode ? saving : isLocked || saving}
              onChange={(e) => adminMode ? setAdminAwayScore(e.target.value) : setAwayScore(e.target.value)}
              className={`w-12 h-12 rounded-xl text-center font-black text-lg outline-none transition ${
                adminMode
                  ? 'bg-slate-950 text-amber-400 border border-amber-800/60 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30'
                  : isLocked
                  ? 'bg-slate-950/60 text-slate-500 border border-slate-900 cursor-not-allowed'
                  : 'bg-slate-950 text-white border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/30'
              }`}
              placeholder="-"
              aria-label={`Goles de ${match.away_team}`}
            />
          </div>

          {/* Away Team */}
          <div className="flex-1 text-left pl-2 min-w-0">
            <span className="text-xs sm:text-base font-extrabold text-slate-100 break-words leading-tight block">
              {tTeam(match.away_team)}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full flex gap-2">
          {!adminMode && !isLocked && (
            <button
              type="button"
              onClick={() => {
                const isDraw = Math.random() < 0.35
                if (isDraw) {
                  const g = Math.floor(Math.random() * 4)
                  setHomeScore(g.toString())
                  setAwayScore(g.toString())
                } else {
                  setHomeScore(Math.floor(Math.random() * 4).toString())
                  setAwayScore(Math.floor(Math.random() * 4).toString())
                }
              }}
              className="shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-lg transition active:scale-90 cursor-pointer"
              title="Resultado aleatorio"
            >
              🎲
            </button>
          )}
          <div className="flex-1">
          {adminMode ? (
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3 px-4 rounded-xl transition flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider shadow active:scale-95 duration-150 cursor-pointer"
            >
              {saving ? (
                <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Guardar'
              )}
            </button>
          ) : !isLocked ? (
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-slate-900 to-slate-950 hover:from-slate-850 hover:to-slate-900 text-primary hover:text-cyan-400 font-bold py-3 px-4 rounded-xl border border-slate-800 hover:border-slate-700 transition flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider shadow-inner active:scale-95 duration-150 cursor-pointer"
            >
              {saving ? (
                <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : prediction ? (
                'Actualizar'
              ) : (
                'Guardar'
              )}
            </button>
          ) : (
            <div className="w-full py-3 px-4 rounded-xl bg-slate-950/20 border border-slate-900/60 text-slate-500 font-bold text-xs uppercase tracking-wider text-center select-none">
              🔒 Bloqueado
            </div>
          )}
          </div>

          {/* Chat Bubble Toggle Button */}
          <button
            type="button"
            onClick={() => onOpenChat({ id: match.id, homeTeam: match.home_team, awayTeam: match.away_team })}
            className="relative shrink-0 w-12 h-12 flex items-center justify-center rounded-xl border bg-slate-900 border-slate-800 hover:border-slate-750 hover:bg-slate-800 text-slate-350 hover:text-slate-100 transition active:scale-90 cursor-pointer"
            title="Comentarios del partido"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            {commentCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 min-w-5 h-5 rounded-full text-[9px] font-black bg-cyan-500 text-slate-950 border border-slate-900 flex items-center justify-center animate-bounce">
                {commentCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Footer Details: Actual Score Display & Status Message */}
      {(isFinished || prediction || statusMsg.text) && (
        <div className="mt-4 pt-3.5 border-t border-slate-900/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs">

          {/* Display actual result vs predicted result */}
          <div className="flex flex-wrap items-center gap-3">
            {isFinished && (
              <span className="font-bold text-slate-400">
                Resultado Oficial:{' '}
                <span className="bg-slate-950 text-primary px-2 py-0.5 rounded font-extrabold font-mono ml-1">
                  {match.home_score} - {match.away_score}
                </span>
              </span>
            )}

            {prediction && (
              <span className="text-slate-500 font-semibold">
                Tu predicción:{' '}
                <span className="font-extrabold font-mono text-slate-400">
                  {prediction.predicted_home} - {prediction.predicted_away}
                </span>
              </span>
            )}
          </div>

          {/* Inline alert notifications */}
          {statusMsg.text && (
            <span
              className={`font-bold transition-all duration-300 text-[11px] flex items-center gap-1 ${
                statusMsg.type === 'success' ? 'text-primary' : 'text-rose-400'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              )}
              {statusMsg.text}
            </span>
          )}
        </div>
      )}
    </form>
  )
}
