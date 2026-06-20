'use client'

import type { Match, Prediction } from '../lib/types'
import { supabase } from '../lib/supabase'
import { FireEffect } from './FireEffect'

interface StatsViewProps {
  matches: Match[]
  predictions: Record<number, Prediction>
  username: string
  userEmail: string
  totalPoints: number
  predictedCount: number
  currentStreak: number
  isOnFire: boolean
  changePwCurrent: string
  setChangePwCurrent: React.Dispatch<React.SetStateAction<string>>
  changePwNew: string
  setChangePwNew: React.Dispatch<React.SetStateAction<string>>
  changePwMsg: { text: string; type: 'success' | 'error' | '' }
  setChangePwMsg: React.Dispatch<React.SetStateAction<{ text: string; type: 'success' | 'error' | '' }>>
  changingPw: boolean
  setChangingPw: React.Dispatch<React.SetStateAction<boolean>>
}

const PHASE_RANGES = [
  { label: 'Fase 1 (Grupos)', min: 1, max: 72 },
  { label: 'Fase 2 (16avos)', min: 73, max: 88 },
  { label: 'Fase 3 (Octavos)', min: 89, max: 96 },
  { label: 'Fase 4 (Cuartos)', min: 97, max: 100 },
  { label: 'Fase 5 (Semis)', min: 101, max: 102 },
  { label: 'Fase 6 (Finales)', min: 103, max: 104 },
]

export function StatsView({
  matches,
  predictions,
  username,
  userEmail,
  totalPoints,
  predictedCount,
  currentStreak,
  isOnFire,
  changePwCurrent,
  setChangePwCurrent,
  changePwNew,
  setChangePwNew,
  changePwMsg,
  setChangePwMsg,
  changingPw,
  setChangingPw,
}: StatsViewProps) {
  // Finished matches with predictions
  const finishedPreds = matches
    .filter(m => m.status === 'finished' && predictions[m.id])
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())

  const totalFinished = finishedPreds.length
  const totalHits = finishedPreds.filter(m => (predictions[m.id]?.points || 0) > 0).length
  const exactHits = finishedPreds.filter(m => {
    const p = predictions[m.id]
    return p && m.home_score === p.predicted_home && m.away_score === p.predicted_away
  }).length
  const effectPct = totalFinished > 0 ? Math.round((totalHits / totalFinished) * 100) : 0
  const exactPct = totalFinished > 0 ? Math.round((exactHits / totalFinished) * 100) : 0

  // Phase stats
  const phaseStats = PHASE_RANGES.map(phase => {
    const phaseMatches = finishedPreds.filter(m => m.id >= phase.min && m.id <= phase.max)
    const pts = phaseMatches.reduce((s, m) => s + (predictions[m.id]?.points || 0), 0)
    const hits = phaseMatches.filter(m => (predictions[m.id]?.points || 0) > 0).length
    return { ...phase, pts, hits, total: phaseMatches.length }
  })
  const maxPhasePts = Math.max(...phaseStats.map(p => p.pts), 1)

  // Best streak ever
  let bestStreak = 0
  let tempStreak = 0
  for (const m of finishedPreds) {
    if ((predictions[m.id]?.points || 0) > 0) { tempStreak++; bestStreak = Math.max(bestStreak, tempStreak) }
    else tempStreak = 0
  }

  // Days active
  const predDates = new Set(finishedPreds.map(m => new Date(m.match_date).toISOString().split('T')[0]))
  const daysActive = predDates.size

  // Days since last prediction
  const lastPredMatch = [...finishedPreds].reverse()[0]
  const daysSinceLast = lastPredMatch
    ? Math.floor((Date.now() - new Date(lastPredMatch.match_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // Cumulative points chart data
  const dailyPoints: { date: string; pts: number; cumulative: number }[] = []
  let cumulative = 0
  const dateMap: Record<string, number> = {}
  finishedPreds.forEach(m => {
    const key = new Date(m.match_date).toISOString().split('T')[0]
    dateMap[key] = (dateMap[key] || 0) + (predictions[m.id]?.points || 0)
  })
  Object.keys(dateMap).sort().forEach(date => {
    cumulative += dateMap[date]
    dailyPoints.push({ date, pts: dateMap[date], cumulative })
  })

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangePwMsg({ text: '', type: '' })
    if (changePwNew.length < 6) {
      setChangePwMsg({ text: 'La nueva contraseña debe tener al menos 6 caracteres.', type: 'error' })
      return
    }
    setChangingPw(true)
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: changePwCurrent,
      })
      if (signInErr) {
        setChangePwMsg({ text: 'Contraseña actual incorrecta.', type: 'error' })
        setChangingPw(false)
        return
      }
      const { error: updateErr } = await supabase.auth.updateUser({ password: changePwNew })
      if (updateErr) throw updateErr
      setChangePwMsg({ text: '¡Contraseña actualizada con éxito!', type: 'success' })
      setChangePwCurrent('')
      setChangePwNew('')
    } catch (err: any) {
      setChangePwMsg({ text: err.message || 'Error al cambiar la contraseña.', type: 'error' })
    } finally {
      setChangingPw(false)
    }
  }

  return (
    <section className="mt-8 animate-fadeIn">
      <div className="mb-6">
        <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          📈 Mis Estadísticas
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Tu rendimiento histórico, rachas y progreso en el torneo.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-2xl font-black text-primary">{effectPct}%</span>
          <span className="block text-[10px] uppercase font-bold text-slate-500 mt-1">Efectividad</span>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-2xl font-black text-amber-400">{exactHits}</span>
          <span className="block text-[10px] uppercase font-bold text-slate-500 mt-1">Exactos ({exactPct}%)</span>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-2xl font-black text-orange-400">{bestStreak}</span>
          <span className="block text-[10px] uppercase font-bold text-slate-500 mt-1">Mejor Racha</span>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-2xl font-black text-slate-200">{daysActive}</span>
          <span className="block text-[10px] uppercase font-bold text-slate-500 mt-1">Días Activo</span>
        </div>
      </div>

      {/* Current status row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className={`relative overflow-hidden bg-slate-950/80 border rounded-2xl p-4 text-center ${isOnFire ? 'border-orange-500/40 shadow-lg shadow-orange-500/10' : 'border-slate-800'}`}>
          {isOnFire && <FireEffect />}
          <span className={`relative z-10 text-2xl font-black block ${currentStreak >= 3 ? 'text-orange-400' : 'text-slate-400'}`}>{currentStreak}</span>
          <span className="relative z-10 block text-[10px] uppercase font-bold text-slate-500 mt-1">Racha Actual {isOnFire && '🔥'}</span>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-2xl font-black text-slate-300">{totalHits}/{totalFinished}</span>
          <span className="block text-[10px] uppercase font-bold text-slate-500 mt-1">Aciertos Total</span>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
          <span className={`text-2xl font-black ${daysSinceLast > 2 ? 'text-rose-400' : 'text-emerald-400'}`}>{daysSinceLast}</span>
          <span className="block text-[10px] uppercase font-bold text-slate-500 mt-1">Días sin jugar</span>
        </div>
      </div>

      {/* Points by Phase Bar Chart */}
      <div className="glass-card p-6 mb-6">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          ⚽ Aciertos por Fase
        </h4>
        <div className="space-y-3">
          {phaseStats.map((phase) => (
            <div key={phase.label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-400">{phase.label}</span>
                <span className="text-xs font-bold text-slate-300">{phase.hits}/{phase.total} aciertos • {phase.pts} pts</span>
              </div>
              <div className="h-3 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${maxPhasePts > 0 ? (phase.pts / maxPhasePts) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cumulative Points Chart */}
      {dailyPoints.length > 1 && (
        <div className="glass-card p-6 mb-6">
          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            📈 Progreso de Puntos
          </h4>
          <div className="relative w-full h-[180px]">
            <svg viewBox="0 0 600 180" width="100%" height="100%" className="overflow-visible">
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const pad = { top: 10, right: 10, bottom: 30, left: 40 }
                const w = 600 - pad.left - pad.right
                const h = 180 - pad.top - pad.bottom
                const maxPts = Math.max(...dailyPoints.map(d => d.cumulative), 1)
                const points = dailyPoints.map((d, i) => ({
                  x: pad.left + (i / (dailyPoints.length - 1)) * w,
                  y: pad.top + h - (d.cumulative / maxPts) * h,
                }))
                const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
                const areaPath = linePath + ` L${points[points.length - 1].x},${pad.top + h} L${points[0].x},${pad.top + h} Z`

                return (
                  <>
                    {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                      <g key={i}>
                        <line x1={pad.left} y1={pad.top + h * (1 - p)} x2={600 - pad.right} y2={pad.top + h * (1 - p)} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                        <text x={pad.left - 5} y={pad.top + h * (1 - p) + 4} fill="#7d8ba6" fontSize="9" textAnchor="end">{Math.round(maxPts * p)}</text>
                      </g>
                    ))}
                    <path d={areaPath} fill="url(#chartFill)" />
                    <path d={linePath} fill="none" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="3" fill="#00d4ff" stroke="#0b0f1a" strokeWidth="2" />
                    ))}
                    {dailyPoints.filter((_, i) => i % Math.max(1, Math.floor(dailyPoints.length / 6)) === 0).map((d, i) => {
                      const idx = dailyPoints.indexOf(d)
                      const x = pad.left + (idx / (dailyPoints.length - 1)) * w
                      return (
                        <text key={i} x={x} y={180 - 10} fill="#7d8ba6" fontSize="8" textAnchor="middle">
                          {new Date(d.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </text>
                      )
                    })}
                  </>
                )
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* Gamification Summary */}
      <div className="glass-card p-6">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          🎮 Resumen de Logros
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${bestStreak >= 3 ? 'bg-orange-500/5 border-orange-500/20' : 'bg-slate-900/50 border-slate-800'}`}>
            <span className="text-2xl">{bestStreak >= 5 ? '🔥' : bestStreak >= 3 ? '⚡' : '💤'}</span>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Mejor Racha: {bestStreak}</span>
              <span className="text-[10px] text-slate-500">{bestStreak >= 5 ? 'Modo bestia desbloqueado' : bestStreak >= 3 ? 'Multiplicador x1.5 alcanzado' : 'Aún no llegas a 3 seguidos'}</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${exactHits >= 5 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-900/50 border-slate-800'}`}>
            <span className="text-2xl">🎯</span>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Resultados Exactos: {exactHits}</span>
              <span className="text-[10px] text-slate-500">{exactHits >= 5 ? '¡Ojo clínico!' : exactHits >= 1 ? 'Buen instinto' : 'Aún sin exactos'}</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${effectPct >= 60 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-900/50 border-slate-800'}`}>
            <span className="text-2xl">{effectPct >= 60 ? '🧠' : effectPct >= 40 ? '💪' : '🎲'}</span>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Efectividad: {effectPct}%</span>
              <span className="text-[10px] text-slate-500">{effectPct >= 60 ? 'Nivel elite' : effectPct >= 40 ? 'Buen promedio' : 'Hay que mejorar'}</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${daysSinceLast <= 1 ? 'bg-emerald-500/5 border-emerald-500/20' : daysSinceLast >= 3 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-900/50 border-slate-800'}`}>
            <span className="text-2xl">{daysSinceLast <= 1 ? '🟢' : daysSinceLast >= 3 ? '🟡' : '🔵'}</span>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Actividad: {daysSinceLast <= 1 ? 'Al día' : `${daysSinceLast} días inactivo`}</span>
              <span className="text-[10px] text-slate-500">{daysSinceLast <= 1 ? '¡Constancia es clave!' : daysSinceLast >= 3 ? '¡No te duermas!' : 'Podrías ser más constante'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="glass-card p-6 mt-6">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          🔑 Cambiar Contraseña
        </h4>
        <form onSubmit={handleChangePw} className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Contraseña actual</label>
            <input
              type="password"
              value={changePwCurrent}
              onChange={(e) => setChangePwCurrent(e.target.value)}
              required
              className="w-full sm:w-72 px-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={changePwNew}
              onChange={(e) => setChangePwNew(e.target.value)}
              required
              minLength={6}
              className="w-full sm:w-72 px-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <button
            type="submit"
            disabled={changingPw}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
          >
            {changingPw ? 'Cambiando...' : 'Cambiar Contraseña'}
          </button>
          {changePwMsg.text && (
            <p className={`text-xs font-bold ${changePwMsg.type === 'success' ? 'text-primary' : 'text-rose-400'}`}>
              {changePwMsg.text}
            </p>
          )}
        </form>
      </div>
    </section>
  )
}
