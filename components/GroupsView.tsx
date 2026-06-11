'use client'

import type { Match } from '../lib/types'
import { groupsData } from '../lib/groupsData'
import { getGroupStandings } from '../lib/getGroupStandings'

interface GroupsViewProps {
  matches: Match[]
  activeGroupIndex: number
  setActiveGroupIndex: React.Dispatch<React.SetStateAction<number>>
}

export function GroupsView({ matches, activeGroupIndex, setActiveGroupIndex }: GroupsViewProps) {
  const activeGroup = groupsData[activeGroupIndex]

  return (
    <section className="mt-8 animate-fadeIn">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            🏆 Grupos del Mundial 2026
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Progreso y clasificación en tiempo real de las 48 selecciones según los resultados oficiales. Usa las flechas o las teclas <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono">←</kbd> y <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono">→</kbd> para navegar.
          </p>
        </div>
      </div>

      {/* Group Selector Row */}
      <div className="flex overflow-x-auto gap-2 mb-6 bg-slate-900/40 p-2 rounded-2xl border border-slate-800/40 max-w-2xl mx-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] justify-start md:justify-center snap-x px-3 py-2.5 w-full">
        {groupsData.map((group, idx) => {
          const isActive = idx === activeGroupIndex
          const groupLetter = group.name.replace('Grupo ', '')
          return (
            <button
              key={group.name}
              onClick={() => setActiveGroupIndex(idx)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs transition-all duration-300 cursor-pointer shrink-0 snap-center ${
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110 border border-primary/20'
                  : 'bg-slate-950 text-slate-450 border border-slate-900 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {groupLetter}
            </button>
          )
        })}
      </div>

      {/* Carousel Container */}
      <div className="relative flex items-center justify-between gap-4 max-w-4xl mx-auto">
        {/* Left Arrow Button */}
        <button
          onClick={() => setActiveGroupIndex(prev => (prev === 0 ? groupsData.length - 1 : prev - 1))}
          className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-350 hover:text-white transition duration-300 shadow-md cursor-pointer shrink-0 hidden md:flex"
          aria-label="Grupo anterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Central Card */}
        <div className="collectible-card w-full p-6 md:p-8 flex flex-col justify-between relative transition-all duration-300 bg-slate-900/60 border border-slate-800/80 rounded-3xl backdrop-blur-md overflow-hidden">
          <div>
            {/* Header of Nav Card */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/60 mb-6">
              <span className="font-black text-lg tracking-wider text-slate-100 flex items-center gap-2">
                <span className="text-primary">⚽</span> {activeGroup.name}
              </span>
              <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-950 text-slate-400 border border-slate-800 uppercase tracking-widest">
                Fase 1 (Grupos)
              </span>
            </div>

            {/* Standings Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-450 font-bold uppercase text-[10px] md:text-xs tracking-wider">
                    <th className="py-3 px-2 text-center w-12">Pos</th>
                    <th className="py-3 px-2">Equipo</th>
                    <th className="py-3 px-2 text-center w-12" title="Partidos Jugados">PJ</th>
                    <th className="py-3 px-2 text-center w-10 hidden sm:table-cell" title="Ganados">G</th>
                    <th className="py-3 px-2 text-center w-10 hidden sm:table-cell" title="Empatados">E</th>
                    <th className="py-3 px-2 text-center w-10 hidden sm:table-cell" title="Perdidos">P</th>
                    <th className="py-3 px-2 text-center w-14 hidden sm:table-cell" title="Goles a Favor">GF</th>
                    <th className="py-3 px-2 text-center w-14 hidden sm:table-cell" title="Goles en Contra">GC</th>
                    <th className="py-3 px-2 text-center w-12" title="Diferencia de Goles">DG</th>
                    <th className="py-3 px-3 text-center w-16 text-primary font-black" title="Puntos">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {getGroupStandings(activeGroup.name, matches).map((teamStats, idx) => {
                    const isTopTwo = idx < 2
                    const isThird = idx === 2
                    let posClass = 'text-slate-400'
                    const rowClass = 'border-b border-slate-900/40 hover:bg-slate-900/30 transition-colors'

                    if (isTopTwo) {
                      posClass = 'text-emerald-400 font-bold bg-emerald-950/40 rounded-full w-6 h-6 flex items-center justify-center mx-auto text-xs border border-emerald-900/30'
                    } else if (isThird) {
                      posClass = 'text-blue-400 font-bold bg-blue-950/30 rounded-full w-6 h-6 flex items-center justify-center mx-auto text-xs border border-blue-900/20'
                    } else {
                      posClass = 'text-slate-500 w-6 h-6 flex items-center justify-center mx-auto'
                    }

                    return (
                      <tr key={teamStats.name} className={rowClass}>
                        <td className="py-3.5 px-2 text-center">
                          <div className={posClass}>{idx + 1}</div>
                        </td>
                        <td className="py-3.5 px-2 font-bold text-slate-200">
                          <span className="flex items-center gap-3">
                            <span className="text-xl select-none" role="img" aria-label={`Bandera de ${teamStats.name}`}>
                              {teamStats.flag}
                            </span>
                            <span className="text-sm md:text-base font-semibold">{teamStats.name}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-center font-bold text-slate-300">{teamStats.pj}</td>
                        <td className="py-3.5 px-2 text-center text-slate-400 hidden sm:table-cell">{teamStats.pg}</td>
                        <td className="py-3.5 px-2 text-center text-slate-400 hidden sm:table-cell">{teamStats.pe}</td>
                        <td className="py-3.5 px-2 text-center text-slate-400 hidden sm:table-cell">{teamStats.pp}</td>
                        <td className="py-3.5 px-2 text-center text-slate-400 hidden sm:table-cell">{teamStats.gf}</td>
                        <td className="py-3.5 px-2 text-center text-slate-400 hidden sm:table-cell">{teamStats.gc}</td>
                        <td className={`py-3.5 px-2 text-center font-bold ${teamStats.gd > 0 ? 'text-emerald-400' : teamStats.gd < 0 ? 'text-rose-500' : 'text-slate-450'}`}>
                          {teamStats.gd > 0 ? `+${teamStats.gd}` : teamStats.gd}
                        </td>
                        <td className="py-3.5 px-3 text-center font-black text-primary text-base">{teamStats.pts}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={() => setActiveGroupIndex(prev => (prev === groupsData.length - 1 ? 0 : prev + 1))}
          className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-350 hover:text-white transition duration-300 shadow-md cursor-pointer shrink-0 hidden md:flex"
          aria-label="Grupo siguiente"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Mobile Carousel Controls */}
      <div className="flex justify-between items-center mt-6 md:hidden px-4">
        <button
          onClick={() => setActiveGroupIndex(prev => (prev === 0 ? groupsData.length - 1 : prev - 1))}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Anterior
        </button>

        <span className="text-xs text-slate-450 font-semibold uppercase tracking-wider">
          {activeGroupIndex + 1} / {groupsData.length}
        </span>

        <button
          onClick={() => setActiveGroupIndex(prev => (prev === groupsData.length - 1 ? 0 : prev + 1))}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer"
        >
          Siguiente
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </section>
  )
}
