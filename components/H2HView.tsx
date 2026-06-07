'use client'

import { getUserRank } from '../lib/getUserRank'

type LeaderboardRow = {
  username: string
  total_points: number
  predictions_count: number
}

interface H2HViewProps {
  leaderboard: LeaderboardRow[]
  username: string
  totalPoints: number
  predictedCount: number
  h2hRival: string
  setH2hRival: React.Dispatch<React.SetStateAction<string>>
}

export function H2HView({ leaderboard, username, totalPoints, predictedCount, h2hRival, setH2hRival }: H2HViewProps) {
  const otherUsers = leaderboard.filter(u => u.username.toLowerCase() !== username.toLowerCase())
  const rival = otherUsers.find(u => u.username === h2hRival)
  const me = leaderboard.find(u => u.username.toLowerCase() === username.toLowerCase())

  const myPoints = me ? Number(me.total_points) : totalPoints
  const rivalPoints = rival ? Number(rival.total_points) : 0
  const myPreds = me ? Number(me.predictions_count) : predictedCount
  const rivalPreds = rival ? Number(rival.predictions_count) : 0

  const totalCombined = myPoints + rivalPoints
  const myPct = totalCombined > 0 ? Math.round((myPoints / totalCombined) * 100) : 50
  const rivalPct = 100 - myPct

  const diff = myPoints - rivalPoints
  let rivalryMsg = ''
  if (rival) {
    if (diff > 0) rivalryMsg = `¡Llevas ${diff} puntos de ventaja sobre ${rival.username}! 💪`
    else if (diff < 0) rivalryMsg = `${rival.username} te lleva ${Math.abs(diff)} puntos. ¡A recuperar terreno! 🔥`
    else rivalryMsg = `¡Están empatados! El próximo partido define. ⚔️`
  }

  return (
    <section className="mt-8 animate-fadeIn">
      <div className="mb-6">
        <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          🥊 Cara a Cara
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Selecciona un rival y compara tu desempeño directamente.
        </p>
      </div>

      {/* Rival selector */}
      <div className="mb-6">
        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Elige tu rival</label>
        <select
          value={h2hRival}
          onChange={(e) => setH2hRival(e.target.value)}
          className="w-full sm:w-64 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition cursor-pointer"
        >
          <option value="">-- Seleccionar --</option>
          {otherUsers.map((u) => (
            <option key={u.username} value={u.username}>{u.username}</option>
          ))}
        </select>
      </div>

      {rival ? (
        <div className="glass-card p-6">
          {/* VS Header */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="text-center">
              <span className="text-2xl block">{getUserRank(myPoints).icon}</span>
              <span className="text-sm font-black text-white mt-1 block">{username}</span>
              <span className="text-xs text-slate-400 font-mono">{myPoints} pts</span>
            </div>
            <span className="text-2xl font-black text-slate-600">VS</span>
            <div className="text-center">
              <span className="text-2xl block">{getUserRank(rivalPoints).icon}</span>
              <span className="text-sm font-black text-white mt-1 block">{rival.username}</span>
              <span className="text-xs text-slate-400 font-mono">{rivalPoints} pts</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1.5">
              <span className="text-primary">{myPct}%</span>
              <span className="text-rose-400">{rivalPct}%</span>
            </div>
            <div className="h-3 rounded-full bg-slate-900 overflow-hidden flex">
              <div className="h-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-500" style={{ width: `${myPct}%` }}></div>
              <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-500" style={{ width: `${rivalPct}%` }}></div>
            </div>
          </div>

          {/* Rivalry message */}
          <p className="text-center text-sm font-bold text-slate-300 mb-6">{rivalryMsg}</p>

          {/* Stats comparison */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Puntos</span>
              <span className={`text-lg font-black block ${myPoints >= rivalPoints ? 'text-primary' : 'text-slate-400'}`}>{myPoints}</span>
              <span className="text-xs text-slate-600">vs {rivalPoints}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Pronósticos</span>
              <span className={`text-lg font-black block ${myPreds >= rivalPreds ? 'text-primary' : 'text-slate-400'}`}>{myPreds}</span>
              <span className="text-xs text-slate-600">vs {rivalPreds}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Efectividad</span>
              <span className={`text-lg font-black block ${(myPreds > 0 ? myPoints / myPreds : 0) >= (rivalPreds > 0 ? rivalPoints / rivalPreds : 0) ? 'text-primary' : 'text-slate-400'}`}>
                {myPreds > 0 ? (myPoints / myPreds).toFixed(1) : '0.0'}
              </span>
              <span className="text-xs text-slate-600">vs {rivalPreds > 0 ? (rivalPoints / rivalPreds).toFixed(1) : '0.0'}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <span className="text-4xl block mb-3">🥊</span>
          <p className="text-slate-400 font-semibold">Selecciona un rival arriba para ver la comparación.</p>
        </div>
      )}
    </section>
  )
}
