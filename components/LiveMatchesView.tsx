'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { MatchChat } from './MatchChat'

type ApiMatch = {
  id: number
  round: string
  group: string
  team1: string
  team2: string
  team1_ar?: string
  team2_ar?: string
  flag1: string
  flag2: string
  status: 'live' | 'finished' | 'scheduled' | string
  score: [number, number] | null
  live_minute: number | null
  date: string
  time: string
  datetime: number
  ground: string
}

const TEAM_TRANSLATIONS: Record<string, string> = {
  'Algeria': 'Argelia',
  'Argentina': 'Argentina',
  'Australia': 'Australia',
  'Austria': 'Austria',
  'Belgium': 'Bélgica',
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
  'Brazil': 'Brasil',
  'Cabo Verde': 'Cabo Verde',
  'Canada': 'Canadá',
  'Colombia': 'Colombia',
  'Congo DR': 'R. D. del Congo',
  'Croatia': 'Croacia',
  'Curaçao': 'Curazao',
  'Czechia': 'Chequia',
  "Côte d'Ivoire": 'Costa de Marfil',
  "Côte'Ivoire": 'Costa de Marfil',
  'Ecuador': 'Ecuador',
  'Egypt': 'Egipto',
  'England': 'Inglaterra',
  'France': 'Francia',
  'Germany': 'Alemania',
  'Ghana': 'Ghana',
  'Haiti': 'Haití',
  'IR Iran': 'Irán',
  'Iraq': 'Irak',
  'Japan': 'Japón',
  'Jordan': 'Jordania',
  'Korea Republic': 'Corea del Sur',
  'Mexico': 'México',
  'Morocco': 'Marruecos',
  'Netherlands': 'Países Bajos',
  'New Zealand': 'Nueva Zelanda',
  'Norway': 'Noruega',
  'Panama': 'Panamá',
  'Paraguay': 'Paraguay',
  'Portugal': 'Portugal',
  'Qatar': 'Qatar',
  'Saudi Arabia': 'Arabia Saudita',
  'Scotland': 'Escocia',
  'Senegal': 'Senegal',
  'South Africa': 'Sudáfrica',
  'Spain': 'España',
  'Sweden': 'Suecia',
  'Switzerland': 'Suiza',
  'Tunisia': 'Túnez',
  'Türkiye': 'Turquía',
  'USA': 'EE. UU.',
  'Uruguay': 'Uruguay',
  'Uzbekistan': 'Uzbekistán'
}

const tTeam = (name: string) => TEAM_TRANSLATIONS[name] || name

type FilterType = 'live' | 'today' | 'upcoming' | 'results'

export default function LiveMatchesView({
  userId,
  isAdmin = false,
  onOpenChat,
}: {
  userId?: string | null
  isAdmin?: boolean
  onOpenChat: (chatMeta: { id: number; homeTeam: string; awayTeam: string }) => void
}) {
  const [filter, setFilter] = useState<FilterType>('today')
  const [matches, setMatches] = useState<ApiMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [secondsSinceLastUpdate, setSecondsSinceLastUpdate] = useState(0)

  const fetchMatches = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)
    setError('')

    try {
      const res = await fetch(`https://wcup2026.org/api/data.php?action=${filter}`)
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`)
      }
      const data = await res.json()
      if (data.ok) {
        setMatches(data.matches || [])
        setSecondsSinceLastUpdate(0)
      } else {
        throw new Error(data.error || 'No se pudo recuperar los datos.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al conectar con la API de resultados.')
      toast.error('Error al actualizar marcadores.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter])

  // Initial fetch and filter change
  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  // Auto-refresh interval (polling) and seconds counter
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchMatches(true)
    }, 30000) // Poll every 30 seconds

    const secondsInterval = setInterval(() => {
      setSecondsSinceLastUpdate((prev) => prev + 1)
    }, 1000)

    return () => {
      clearInterval(pollInterval)
      clearInterval(secondsInterval)
    }
  }, [fetchMatches])

  const handleManualRefresh = () => {
    fetchMatches(true)
    toast.success('Marcadores actualizados')
  }

  // Format Unix timestamp to America/Costa_Rica
  const formatKickoffTime = (timestamp: number) => {
    try {
      return new Date(timestamp * 1000).toLocaleString('es-CR', {
        timeZone: 'America/Costa_Rica',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (err) {
      return 'Fecha no disponible'
    }
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      {/* Title Header with Sync details */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 select-none">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2">
            ⚡ Marcadores en Vivo
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Datos consolidados e información en tiempo real directamente de la Copa Mundial FIFA 2026™.
          </p>
        </div>

        {/* Sync Indicator and Manual Refresh */}
        <div className="flex items-center gap-3 bg-slate-900/40 border border-slate-800/80 px-4 py-2 rounded-2xl text-xs shrink-0 backdrop-blur-[2px]">
          <div className="flex flex-col text-right">
            <span className="text-slate-450 font-medium">
              {refreshing ? 'Sincronizando...' : `Actualizado hace ${secondsSinceLastUpdate}s`}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold font-mono">Intervalo: 30s</span>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-90 disabled:opacity-50 cursor-pointer"
            title="Sincronizar ahora"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Primary Tab Navigation Filter */}
      <div className="flex flex-wrap gap-2 select-none border-b border-slate-900/60 pb-3">
        {(
          [
            { key: 'live', label: '🔴 En Vivo', title: 'Partidos jugándose ahora' },
            { key: 'today', label: '📅 Hoy', title: 'Partidos programados para hoy' },
            { key: 'upcoming', label: '⏳ Próximos', title: 'Próximos partidos del fixture' },
            { key: 'results', label: '✅ Resultados', title: 'Partidos terminados recientemente' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2.5 rounded-xl border text-xs uppercase font-extrabold tracking-wider transition duration-150 cursor-pointer active:scale-95 ${
              filter === tab.key
                ? 'bg-primary/10 border-primary/40 text-primary shadow-lg shadow-cyan-950/5'
                : 'bg-slate-900/40 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-800'
            }`}
            title={tab.title}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* View Content Area */}
      {loading ? (
        /* Card Skeletons Loader */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-44 rounded-3xl bg-slate-900/30 border border-slate-900 p-5 flex flex-col justify-between animate-pulse select-none"
            >
              <div className="flex justify-between items-center">
                <div className="h-3.5 w-24 bg-slate-800 rounded"></div>
                <div className="h-5 w-16 bg-slate-800 rounded-full"></div>
              </div>
              <div className="flex justify-center items-center gap-4 my-2">
                <div className="h-4 w-16 bg-slate-800 rounded ml-auto"></div>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 bg-slate-800 rounded-lg"></div>
                  <div className="h-4 w-6 bg-slate-800 rounded"></div>
                  <div className="h-10 w-10 bg-slate-800 rounded-lg"></div>
                </div>
                <div className="h-4 w-16 bg-slate-800 rounded mr-auto"></div>
              </div>
              <div className="h-3 w-36 bg-slate-800 rounded mx-auto"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error Display */
        <div className="flex flex-col items-center justify-center p-8 bg-slate-950/20 border border-rose-950/30 rounded-3xl text-center select-none">
          <span className="text-2xl mb-2">⚠️</span>
          <span className="text-xs uppercase font-extrabold tracking-wider text-rose-400">Error de Conexión</span>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed">{error}</p>
          <button
            onClick={() => fetchMatches()}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-850 hover:border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : matches.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-14 bg-slate-950/20 border border-slate-900/60 rounded-3xl text-center select-none">
          <span className="text-3xl mb-3">⚽</span>
          <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
            {filter === 'live'
              ? 'Sin Partidos en Curso'
              : filter === 'today'
              ? 'Sin Partidos Hoy'
              : 'Fixture Vacío'}
          </span>
          <p className="text-xs text-slate-500 max-w-xs mt-1.5 leading-relaxed">
            {filter === 'live'
              ? 'No hay encuentros disputándose en este momento. Revisa la pestaña de "Hoy" o "Próximos" para ver el calendario.'
              : filter === 'today'
              ? 'No hay partidos programados para este día. Revisa la pestaña de "Próximos" o "Resultados".'
              : 'No se encontraron registros de partidos para esta categoría.'}
          </p>
        </div>
      ) : (
        /* Matches Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((match) => {
            const isLive = match.status === 'live'
            const isFinished = match.status === 'finished'

            return (
              <div
                key={match.id}
                className={`relative overflow-hidden rounded-3xl p-5 shadow-lg border transition-all duration-300 bg-slate-900/60 hover:border-slate-750/80 shadow-primary/5 ${
                  isLive
                    ? 'border-emerald-500/30 bg-emerald-950/5 shadow-emerald-950/5'
                    : isFinished
                    ? 'border-slate-900 bg-slate-900/20'
                    : 'border-slate-850/80'
                }`}
              >
                {/* Meta header row */}
                <div className="flex justify-between items-center gap-4 mb-4 select-none">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">
                      {match.round} {match.group ? `• ${match.group}` : ''}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {isLive ? (
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 animate-pulse">
                        <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                        En Vivo {match.live_minute ? `• ${match.live_minute}'` : ''}
                      </span>
                    ) : isFinished ? (
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-950 text-slate-400 border border-slate-900">
                        Finalizado
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        Programado
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Matchup section */}
                <div className="flex items-center justify-between gap-2 my-2">
                  {/* Home Team */}
                  <div className="flex-1 flex flex-col items-center text-center gap-2 min-w-0">
                    <img
                      src={match.flag1}
                      alt={match.team1}
                      className="w-10 h-10 object-contain rounded-lg bg-slate-950/45 p-1 border border-slate-800/40 select-none shadow-md"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = '/logo-wc2026.png'
                      }}
                    />
                    <span className="text-xs sm:text-sm font-extrabold text-slate-200 truncate w-full">
                      {tTeam(match.team1)}
                    </span>
                  </div>

                  {/* Score or time separator */}
                  <div className="shrink-0 flex flex-col items-center justify-center px-4">
                    {isLive || isFinished ? (
                      <div className="bg-slate-950 text-slate-100 font-mono font-black text-xl px-4 py-2 rounded-xl border border-slate-850 select-none flex items-center gap-2 shadow-inner">
                        <span className={isLive ? 'text-primary' : ''}>
                          {match.score ? match.score[0] : 0}
                        </span>
                        <span className="text-slate-650 font-bold text-sm">:</span>
                        <span className={isLive ? 'text-primary' : ''}>
                          {match.score ? match.score[1] : 0}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center bg-slate-950/50 border border-slate-900 px-3 py-1.5 rounded-xl text-center select-none font-bold text-[10px] uppercase tracking-wider text-slate-400">
                        <span>{match.time || '12:00'}</span>
                      </div>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="flex-1 flex flex-col items-center text-center gap-2 min-w-0">
                    <img
                      src={match.flag2}
                      alt={match.team2}
                      className="w-10 h-10 object-contain rounded-lg bg-slate-950/45 p-1 border border-slate-800/40 select-none shadow-md"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = '/logo-wc2026.png'
                      }}
                    />
                    <span className="text-xs sm:text-sm font-extrabold text-slate-200 truncate w-full">
                      {tTeam(match.team2)}
                    </span>
                  </div>
                </div>

                {/* Sede / DateTime Info footer */}
                <div className="mt-4 pt-3.5 border-t border-slate-900/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5 text-[10px] text-slate-500 font-semibold select-none">
                  <span>⏰ Kickoff: {formatKickoffTime(match.datetime)}</span>
                  <span className="truncate max-w-[200px]">📍 {match.ground}</span>
                </div>

                {userId && (
                  <div className="mt-3.5 pt-3 border-t border-slate-900/50 flex justify-between items-center">
                    <button
                      onClick={() => onOpenChat({ id: match.id + 1, homeTeam: match.team1, awayTeam: match.team2 })}
                      className="px-3 py-1.5 rounded-xl border bg-slate-950 border-slate-900 hover:border-slate-850 text-slate-450 hover:text-slate-200 text-[10px] uppercase font-extrabold tracking-wider transition duration-150 flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      💬 Chat de Partido
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
