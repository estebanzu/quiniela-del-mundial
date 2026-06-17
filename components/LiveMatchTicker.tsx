'use client'

import { useEffect, useState } from 'react'
import type { Match } from '../lib/types'
import { tTeam } from '../lib/translations'

interface LiveMatchTickerProps {
  matches: Match[]
}

export default function LiveMatchTicker({ matches }: LiveMatchTickerProps) {
  const [sortedItems, setSortedItems] = useState<Match[]>([])

  useEffect(() => {
    if (!matches || matches.length === 0) return

    // Prioritize: Live first, then pending starting closest to now, then recently finished
    const live = matches.filter((m) => m.status === 'live')
    
    const pending = matches
      .filter((m) => m.status === 'pending')
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
      
    const finished = matches
      .filter((m) => m.status === 'finished')
      .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()) // Most recent first

    // Combine them up to 10 items for a clean scroll
    const combined = [...live, ...pending, ...finished].slice(0, 12)
    setSortedItems(combined)
  }, [matches])

  if (sortedItems.length === 0) {
    return (
      <div className="w-full bg-slate-950/40 border border-slate-900 backdrop-blur-md py-2 px-4 rounded-2xl flex items-center justify-center text-xs text-slate-500 font-bold select-none">
        🏆 Quiniela del Mundial 2026 en marcha. ¡Prepara tus predicciones!
      </div>
    )
  }

  // Helper to format date
  const formatTickerDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString('es-ES', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  // Loop twice to ensure infinite marquee scrolling is gapless
  const tickerItems = [...sortedItems, ...sortedItems]

  return (
    <div className="w-full bg-slate-950/50 border border-slate-900/60 shadow-lg shadow-black/20 backdrop-blur-md py-3.5 px-1 rounded-[22px] overflow-hidden select-none relative flex items-center">
      {/* Decorative side fades to hide edges smoothly */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0b0f1a] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0b0f1a] to-transparent z-10 pointer-events-none" />

      {/* Marquee Body */}
      <div className="ticker-marquee flex gap-10 items-center">
        {tickerItems.map((match, idx) => {
          const isLive = match.status === 'live'
          const isFinished = match.status === 'finished'

          return (
            <div
              key={`${match.id}-${idx}`}
              className="flex items-center gap-3 shrink-0 py-0.5 px-3 rounded-full hover:bg-slate-900/40 transition duration-150 cursor-pointer"
            >
              {/* Status Indicator */}
              {isLive ? (
                <span className="flex items-center gap-1 bg-rose-500/15 border border-rose-500/25 px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-rose-400 tracking-wider">
                  <span className="relative flex h-1.5 w-1.5 mr-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                  </span>
                  LIV
                </span>
              ) : isFinished ? (
                <span className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-emerald-400 tracking-wider">
                  FIN
                </span>
              ) : (
                <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  PEND
                </span>
              )}

              {/* Matchup & Score */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-extrabold text-white text-[11px] uppercase tracking-wide">
                  {tTeam(match.home_team)}
                </span>
                
                {/* Display Scores or VS */}
                {isFinished || isLive ? (
                  <span className="bg-slate-950/60 px-1.5 py-0.5 rounded-md font-black font-mono text-cyan-400 border border-slate-900 text-[11px]">
                    {match.home_score} - {match.away_score}
                  </span>
                ) : (
                  <span className="text-slate-500 font-bold text-[10px]">vs</span>
                )}

                <span className="font-extrabold text-white text-[11px] uppercase tracking-wide">
                  {tTeam(match.away_team)}
                </span>
              </div>

              {/* Date details for pending games */}
              {!isFinished && !isLive && (
                <span className="text-[10px] text-slate-500 font-medium font-mono">
                  ({formatTickerDate(match.match_date)})
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
