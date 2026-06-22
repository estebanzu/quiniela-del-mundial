'use client'

type PhaseRow = {
  username: string
  fase1: number
  fase2: number
  fase3: number
  fase4: number
  fase5: number
  fase6: number
  total_points: number
}

interface PhasesViewProps {
  phaseLeaderboard: PhaseRow[]
  username: string
}

export function PhasesView({ phaseLeaderboard, username }: PhasesViewProps) {
  const maxes = {
    f1: phaseLeaderboard.length ? Math.max(...phaseLeaderboard.map(u => Number(u.fase1) || 0)) : 0,
    f2: phaseLeaderboard.length ? Math.max(...phaseLeaderboard.map(u => Number(u.fase2) || 0)) : 0,
    f3: phaseLeaderboard.length ? Math.max(...phaseLeaderboard.map(u => Number(u.fase3) || 0)) : 0,
    f4: phaseLeaderboard.length ? Math.max(...phaseLeaderboard.map(u => Number(u.fase4) || 0)) : 0,
    f5: phaseLeaderboard.length ? Math.max(...phaseLeaderboard.map(u => Number(u.fase5) || 0)) : 0,
    f6: phaseLeaderboard.length ? Math.max(...phaseLeaderboard.map(u => Number(u.fase6) || 0)) : 0,
  }

  return (
    <section className="mt-8 animate-fadeIn">
      <div className="mb-6">
        <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          📊 Tabla de Posiciones por Fases
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Visualiza el desglose de puntos obtenidos en cada una de las 6 fases del torneo. ¡El ganador de cada fase recibe un trofeo 🏆!
        </p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold uppercase text-xs tracking-wider">
                <th className="py-4 px-2 sm:px-4 text-center w-10 sm:w-16">Pos</th>
                <th className="py-4 px-2 sm:px-4">Usuario</th>
                <th className="py-4 px-1 sm:px-2 text-center w-12 sm:w-28" title="Fase de Grupos (Partidos 1-72)"><span className="hidden md:inline">Fase 1 (Grupos)</span><span className="md:hidden">F1</span></th>
                <th className="py-4 px-1 sm:px-2 text-center w-12 sm:w-28" title="Dieciseisavos (Partidos 73-88)"><span className="hidden md:inline">Fase 2 (16avos)</span><span className="md:hidden">F2</span></th>
                <th className="py-4 px-1 sm:px-2 text-center w-12 sm:w-28" title="Octavos (Partidos 89-96)"><span className="hidden md:inline">Fase 3 (Octavos)</span><span className="md:hidden">F3</span></th>
                <th className="py-4 px-1 sm:px-2 text-center w-12 sm:w-28" title="Cuartos (Partidos 97-100)"><span className="hidden md:inline">Fase 4 (Cuartos)</span><span className="md:hidden">F4</span></th>
                <th className="py-4 px-1 sm:px-2 text-center w-12 sm:w-28" title="Semifinales (Partidos 101-102)"><span className="hidden md:inline">Fase 5 (Semis)</span><span className="md:hidden">F5</span></th>
                <th className="py-4 px-1 sm:px-2 text-center w-12 sm:w-28" title="Tercer Puesto y Final (Partidos 103-104)"><span className="hidden md:inline">Fase 6 (Finales)</span><span className="md:hidden">F6</span></th>
                <th className="py-4 px-2 sm:px-4 text-center text-primary font-black w-16 sm:w-28"><span className="hidden sm:inline">Total Pts</span><span className="sm:hidden">Total</span></th>
              </tr>
            </thead>
            <tbody>
              {phaseLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-semibold">
                    No hay datos de emulación disponibles todavía. Presiona &quot;Emular Mundial&quot; en el Panel Admin.
                  </td>
                </tr>
              ) : (
                phaseLeaderboard.map((row, idx) => {
                  const isCurrentUser = username.toLowerCase() === (row.username || '').toLowerCase()
                  const pos = idx + 1

                  let posEl = <span>{pos}</span>
                  if (pos === 1) posEl = <span className="text-xl">🥇</span>
                  else if (pos === 2) posEl = <span className="text-xl">🥈</span>
                  else if (pos === 3) posEl = <span className="text-xl">🥉</span>

                  const phaseCell = (val: number, max: number) => (
                    <td className={`py-3 px-1 sm:px-2 text-center font-mono ${Number(val) === max && max > 0 ? 'text-amber-400 font-bold' : ''}`}>
                      {val} {Number(val) === max && max > 0 ? '🏆' : ''}
                    </td>
                  )

                  return (
                    <tr
                      key={row.username || `row-${idx}`}
                      className={`border-b border-slate-900 hover:bg-slate-900/30 transition-colors ${
                        isCurrentUser ? 'bg-primary/5 font-extrabold text-white' : 'text-slate-300'
                      }`}
                    >
                      <td className="py-3 px-2 sm:px-4 text-center font-bold">{posEl}</td>
                      <td className="py-3 px-2 sm:px-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isCurrentUser ? 'bg-primary animate-pulse' : 'bg-slate-700'}`}></span>
                          <span className="truncate max-w-[70px] xs:max-w-[120px]">{row.username || 'Desconocido'}</span>
                          {isCurrentUser && <span className="text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold px-1 sm:px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 shrink-0">Tú</span>}
                        </div>
                      </td>
                      {phaseCell(row.fase1, maxes.f1)}
                      {phaseCell(row.fase2, maxes.f2)}
                      {phaseCell(row.fase3, maxes.f3)}
                      {phaseCell(row.fase4, maxes.f4)}
                      {phaseCell(row.fase5, maxes.f5)}
                      {phaseCell(row.fase6, maxes.f6)}
                      <td className="py-3 px-2 sm:px-4 text-center font-black text-primary text-sm sm:text-base font-mono bg-slate-900/20">{row.total_points}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resultados parciales */}
      {phaseLeaderboard.length > 0 && (
        <div className="mt-6 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            🏅 Resultados Parciales
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Fase 1 (Grupos)', key: 'fase1' as const, max: maxes.f1 },
              { label: 'Fase 2 (16avos)', key: 'fase2' as const, max: maxes.f2 },
              { label: 'Fase 3 (Octavos)', key: 'fase3' as const, max: maxes.f3 },
              { label: 'Fase 4 (Cuartos)', key: 'fase4' as const, max: maxes.f4 },
              { label: 'Fase 5 (Semis)', key: 'fase5' as const, max: maxes.f5 },
              { label: 'Fase 6 (Finales)', key: 'fase6' as const, max: maxes.f6 },
            ].map((phase) => {
              const leader = phaseLeaderboard.find(u => Number(u[phase.key]) === phase.max && phase.max > 0)
              return (
                <div key={phase.key} className="bg-slate-950/60 border border-slate-900 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">{phase.label}</span>
                  {leader ? (
                    <span className="text-sm font-extrabold text-amber-400 flex items-center gap-1 mt-1">
                      🥇 {leader.username} <span className="text-xs text-slate-400 font-mono">({phase.max} pts)</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600 mt-1 block">Sin datos aún</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Líder general */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Líder General del Torneo</span>
                <span className="text-base font-black text-amber-400">
                  {phaseLeaderboard[0]?.username || '—'}
                  <span className="text-sm text-slate-300 font-mono ml-2">{phaseLeaderboard[0]?.total_points || 0} pts</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
