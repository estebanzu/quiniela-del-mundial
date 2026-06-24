'use client'

import type { Match } from '../lib/types'
import { tTeam } from '../lib/translations'

const TZ = 'America/Costa_Rica'

function dateKeyInTZ(d: Date): string {
  return d.toLocaleDateString('sv-SE', { timeZone: TZ })
}

function todayKeyInTZ(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ })
}

const WORLD_CUP_START = new Date('2026-06-11T00:00:00')

function buildScheduleDays(matches: Match[]) {
  const dayMap: Record<string, Match[]> = {}
  matches.forEach((m) => {
    const key = dateKeyInTZ(new Date(m.match_date))
    if (!dayMap[key]) dayMap[key] = []
    dayMap[key].push(m)
  })

  return Object.keys(dayMap).sort().map((key) => {
    const d = new Date(key + 'T12:00:00')
    const diffMs = d.getTime() - WORLD_CUP_START.getTime()
    const dayNum = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
    const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
    return { dateKey: key, label: label.charAt(0).toUpperCase() + label.slice(1), dayNum, matches: dayMap[key] }
  })
}

interface ScheduleViewProps {
  matches: Match[]
  activeScheduleDayIndex: number
  setActiveScheduleDayIndex: React.Dispatch<React.SetStateAction<number>>
  onOpenChat: (chatMeta: { id: number; homeTeam: string; awayTeam: string }) => void
  userId: string | null
}

export function ScheduleView({ matches, activeScheduleDayIndex, setActiveScheduleDayIndex, onOpenChat, userId }: ScheduleViewProps) {
  const scheduleDays = buildScheduleDays(matches)

  const todayKey = todayKeyInTZ()
  let defaultIdx = scheduleDays.findIndex(d => d.dateKey === todayKey)
  if (defaultIdx === -1) {
    defaultIdx = scheduleDays.findIndex(d => d.dateKey >= todayKey)
    if (defaultIdx === -1) defaultIdx = 0
  }

  const currentDayIdx = activeScheduleDayIndex < scheduleDays.length ? activeScheduleDayIndex : defaultIdx
  const activeDay = scheduleDays[currentDayIdx]

  return (
    <section className="mt-8 animate-fadeIn">
      <div className="mb-6">
        <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          📅 Calendario de Partidos
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Navega día por día los partidos del mundial. Usa las flechas o las teclas <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono">←</kbd> y <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono">→</kbd>.
        </p>
      </div>

      {scheduleDays.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-[32px] bg-slate-900/20 border border-slate-900">
          <p className="text-slate-400 font-semibold">No se encontraron partidos en el calendario.</p>
        </div>
      ) : (
        <>
          <div className="flex overflow-x-auto gap-2 mb-4 bg-slate-900/40 p-2 rounded-2xl border border-slate-800/40 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] snap-x px-3 py-2.5 w-full">
            {scheduleDays.map((day, idx) => {
              const isActive = idx === currentDayIdx
              return (
                <button
                  key={day.dateKey}
                  onClick={() => setActiveScheduleDayIndex(idx)}
                  className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl font-bold text-xs transition-all duration-300 cursor-pointer shrink-0 snap-center min-w-[60px] ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105 border border-primary/20'
                      : 'bg-slate-950 text-slate-450 border border-slate-900 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-[9px] uppercase tracking-wider font-black">{day.dayNum > 0 ? `Día ${day.dayNum}` : day.dateKey.slice(5)}</span>
                  <span className="text-[10px] mt-0.5 font-semibold opacity-80">{day.label}</span>
                </button>
              )
            })}
          </div>

          <div className="mb-6 px-2">
            <input
              type="range"
              min={0}
              max={scheduleDays.length - 1}
              value={currentDayIdx}
              onChange={(e) => setActiveScheduleDayIndex(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-800 accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-primary/30 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20"
            />
            <div className="flex justify-between mt-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Día 1</span>
              <span className="text-primary font-black">Día {scheduleDays[currentDayIdx]?.dayNum > 0 ? scheduleDays[currentDayIdx].dayNum : currentDayIdx + 1}</span>
              <span>Día {scheduleDays[scheduleDays.length - 1]?.dayNum > 0 ? scheduleDays[scheduleDays.length - 1].dayNum : scheduleDays.length}</span>
            </div>
          </div>

          <div className="relative flex items-center justify-between gap-4 max-w-4xl mx-auto">
            <button
              onClick={() => setActiveScheduleDayIndex(prev => (prev === 0 ? scheduleDays.length - 1 : prev - 1))}
              className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-350 hover:text-white transition duration-300 shadow-md cursor-pointer shrink-0 hidden md:flex"
              aria-label="Día anterior"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>

            <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-3xl backdrop-blur-md overflow-hidden p-6 md:p-8">
              {activeDay && (
                <>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800/60 mb-5">
                    <span className="font-black text-lg tracking-wider text-slate-100 flex items-center gap-2">
                      <span className="text-primary">📅</span> {activeDay.label}
                    </span>
                    <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-950 text-slate-400 border border-slate-800 uppercase tracking-widest">
                      {activeDay.dayNum > 0 ? `Día ${activeDay.dayNum}` : activeDay.dateKey} • {activeDay.matches.length} partido{activeDay.matches.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {activeDay.matches.map((match) => {
                      const mDate = new Date(match.match_date)
                      const mTime = mDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
                      const isFinished = match.status === 'finished'

                      return (
                        <div
                          key={match.id}
                          className="bg-slate-950/40 border border-slate-900 rounded-2xl p-4 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-300 font-mono">{mTime}</span>
                                {(match.stage_group || match.venue) && (
                                  <span className="text-[9px] text-slate-500 font-semibold max-w-[120px] truncate">
                                    {match.stage_group || match.venue}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex-1 flex items-center justify-center gap-2 sm:gap-4 px-2">
                              <span className="text-xs sm:text-sm font-extrabold text-slate-200 text-right flex-1 break-words leading-tight">{tTeam(match.home_team)}</span>
                              <span className="text-[10px] font-bold text-slate-650 uppercase tracking-widest shrink-0">vs</span>
                              <span className="text-xs sm:text-sm font-extrabold text-slate-200 text-left flex-1 break-words leading-tight">{tTeam(match.away_team)}</span>
                            </div>
                          </div>

                          <div className="text-center flex flex-col items-center gap-2.5">
                            <div>
                              {isFinished ? (
                                <span className="inline-flex items-center justify-center font-mono font-black text-sm bg-slate-950/60 text-primary px-2.5 py-1 rounded-lg border border-slate-900">
                                  {match.home_score} - {match.away_score}
                                </span>
                              ) : (
                                <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-slate-900 border border-slate-850 text-slate-500">
                                  Pendiente
                                </span>
                              )}
                            </div>

                            {userId && (
                              <button
                                type="button"
                                onClick={() => onOpenChat({ id: match.id, homeTeam: match.home_team, awayTeam: match.away_team })}
                                className="px-3 py-1.5 rounded-xl border bg-slate-950 border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-200 text-[10px] uppercase font-extrabold tracking-wider transition duration-150 flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                💬 Chat de Partido
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setActiveScheduleDayIndex(prev => (prev === scheduleDays.length - 1 ? 0 : prev + 1))}
              className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-350 hover:text-white transition duration-300 shadow-md cursor-pointer shrink-0 hidden md:flex"
              aria-label="Día siguiente"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          <div className="flex justify-between items-center mt-6 md:hidden px-4">
            <button
              onClick={() => setActiveScheduleDayIndex(prev => (prev === 0 ? scheduleDays.length - 1 : prev - 1))}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Anterior
            </button>
            <span className="text-xs text-slate-450 font-semibold uppercase tracking-wider">
              {currentDayIdx + 1} / {scheduleDays.length}
            </span>
            <button
              onClick={() => setActiveScheduleDayIndex(prev => (prev === scheduleDays.length - 1 ? 0 : prev + 1))}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer"
            >
              Siguiente
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </>
      )}
    </section>
  )
}
