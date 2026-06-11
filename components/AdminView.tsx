'use client'

interface AdminUser {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
}

interface LoginStat {
  login_day: string
  active_users: number
}

interface AdminViewProps {
  adminUsers: AdminUser[]
  loginStats: LoginStat[]
  loadingAdminData: boolean
  adminSearch: string
  setAdminSearch: React.Dispatch<React.SetStateAction<string>>
  hoveredBar: number | null
  setHoveredBar: React.Dispatch<React.SetStateAction<number | null>>
  sendingDailyEmail: boolean
  setSendingDailyEmail: React.Dispatch<React.SetStateAction<boolean>>
  dailyEmailDate: string
  setDailyEmailDate: React.Dispatch<React.SetStateAction<string>>
  resetUser: { id: string; email: string } | null
  setResetUser: React.Dispatch<React.SetStateAction<{ id: string; email: string } | null>>
  newPassword: string
  setNewPassword: React.Dispatch<React.SetStateAction<string>>
  resettingPassword: boolean
  deleteUser: { id: string; email: string } | null
  setDeleteUser: React.Dispatch<React.SetStateAction<{ id: string; email: string } | null>>
  deletingUser: boolean
  onResetPassword: (e: React.FormEvent) => Promise<void>
  onDeleteUser: () => Promise<void>
  onSendDailyEmail: () => Promise<void>
  getCompleteStats: () => { dateStr: string; displayDate: string; count: number }[]
}

export function AdminView({
  adminUsers,
  loginStats,
  loadingAdminData,
  adminSearch,
  setAdminSearch,
  hoveredBar,
  setHoveredBar,
  sendingDailyEmail,
  dailyEmailDate,
  setDailyEmailDate,
  resetUser,
  setResetUser,
  newPassword,
  setNewPassword,
  resettingPassword,
  deleteUser,
  setDeleteUser,
  deletingUser,
  onResetPassword,
  onDeleteUser,
  onSendDailyEmail,
  getCompleteStats,
}: AdminViewProps) {
  const filteredUsers = adminUsers.filter((u) =>
    u.email.toLowerCase().includes(adminSearch.toLowerCase())
  )

  return (
    <section className="mt-8 animate-fadeIn">
      <div>
        <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          🔧 Panel de Administración
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Monitorea el uso de la quiniela, gestiona cuentas de usuarios y observa estadísticas de login.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-8">
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Usuarios</span>
            <span className="text-2xl font-black text-slate-100">{adminUsers.length}</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Activos Hoy</span>
            <span className="text-2xl font-black text-emerald-400">
              {loginStats.find(s => s.login_day === new Date().toISOString().split('T')[0])?.active_users || 0}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Promedio Diario</span>
            <span className="text-2xl font-black text-amber-400">
              {loginStats.length > 0
                ? Math.round(loginStats.reduce((sum, s) => sum + s.active_users, 0) / loginStats.length * 10) / 10
                : 0}
            </span>
          </div>
        </div>
      </div>

      {/* Login stats chart */}
      <div className="glass-card p-6 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              📈 Inicios de Sesión Diarios
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Usuarios únicos activos por día en los últimos 14 días.
            </p>
          </div>
        </div>

        <div className="relative w-full h-[220px]">
          {(() => {
            const chartData = getCompleteStats()
            const maxVal = Math.max(...chartData.map(c => c.count))
            const yScaleMax = Math.max(maxVal + 1, 5)
            const svgWidth = 600
            const svgHeight = 220
            const chartPadding = { top: 20, right: 20, bottom: 40, left: 35 }
            const chartWidth = svgWidth - chartPadding.left - chartPadding.right
            const chartHeight = svgHeight - chartPadding.top - chartPadding.bottom
            const colWidth = chartWidth / chartData.length
            const barPadding = 8

            const gridLines = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
              yVal: chartPadding.top + chartHeight * (1 - p),
              labelVal: Math.round(yScaleMax * p),
            }))

            return (
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%" className="overflow-visible">
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d4ff" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="hoverGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d4ff" />
                    <stop offset="100%" stopColor="#ffcc00" stopOpacity="0.6" />
                  </linearGradient>
                  <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Grid Lines */}
                {gridLines.map((line, idx) => (
                  <g key={idx} className="opacity-30">
                    <line x1={chartPadding.left} y1={line.yVal} x2={svgWidth - chartPadding.right} y2={line.yVal} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" strokeWidth="1" />
                    <text x={chartPadding.left - 8} y={line.yVal + 4} fill="#7d8ba6" fontSize="10" fontWeight="bold" textAnchor="end">{line.labelVal}</text>
                  </g>
                ))}

                {/* Bars */}
                {chartData.map((dataPoint, idx) => {
                  const barHeight = (dataPoint.count / yScaleMax) * chartHeight
                  const xPos = chartPadding.left + idx * colWidth + barPadding / 2
                  const yPos = chartPadding.top + chartHeight - barHeight
                  const barW = Math.max(colWidth - barPadding, 10)
                  const isHovered = hoveredBar === idx

                  return (
                    <g key={idx}>
                      <rect
                        x={chartPadding.left + idx * colWidth}
                        y={chartPadding.top}
                        width={colWidth}
                        height={chartHeight}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredBar(idx)}
                        onMouseLeave={() => setHoveredBar(null)}
                      />
                      <rect
                        x={xPos} y={yPos} width={barW} height={Math.max(barHeight, 2)}
                        rx="4" ry="4"
                        fill={isHovered ? 'url(#hoverGradient)' : 'url(#barGradient)'}
                        filter={isHovered ? 'url(#glowFilter)' : ''}
                        className="transition-all duration-200 pointer-events-none"
                      />
                      {idx % 2 === 0 && (
                        <text x={xPos + barW / 2} y={svgHeight - 15} fill="#7d8ba6" fontSize="9" fontWeight="bold" textAnchor="middle" className="select-none">
                          {dataPoint.displayDate}
                        </text>
                      )}
                    </g>
                  )
                })}

                {/* Tooltip */}
                {hoveredBar !== null && (() => {
                  const item = chartData[hoveredBar]
                  const barHeight = (item.count / yScaleMax) * chartHeight
                  const xPos = chartPadding.left + hoveredBar * colWidth + colWidth / 2
                  const yPos = chartPadding.top + chartHeight - barHeight
                  const tooltipW = 100
                  const tooltipH = 45
                  let tooltipX = xPos - tooltipW / 2
                  const tooltipY = Math.max(yPos - tooltipH - 10, 5)
                  if (tooltipX < chartPadding.left) tooltipX = chartPadding.left
                  if (tooltipX + tooltipW > svgWidth - chartPadding.right) tooltipX = svgWidth - chartPadding.right - tooltipW

                  return (
                    <g className="pointer-events-none">
                      <rect x={tooltipX} y={tooltipY} width={tooltipW} height={tooltipH} rx="8" fill="rgba(11,15,26,0.95)" stroke="rgba(0,212,255,0.4)" strokeWidth="1" />
                      <text x={tooltipX + tooltipW / 2} y={tooltipY + 16} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">{item.dateStr}</text>
                      <text x={tooltipX + tooltipW / 2} y={tooltipY + 32} fill="#00d4ff" fontSize="11" fontWeight="bold" textAnchor="middle">
                        {item.count} {item.count === 1 ? 'usuario' : 'usuarios'}
                      </text>
                    </g>
                  )
                })()}
              </svg>
            )
          })()}
        </div>
      </div>

      {/* Send Daily Results Email */}
      <div className="glass-card p-6 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              📧 Enviar Resultados del Día
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Envía un correo con los resultados del día a todos los usuarios con email registrado.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={dailyEmailDate}
              onChange={(e) => setDailyEmailDate(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono outline-none focus:border-primary transition cursor-pointer"
            />
            <button
              type="button"
              disabled={sendingDailyEmail}
              onClick={onSendDailyEmail}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {sendingDailyEmail ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              )}
              {sendingDailyEmail ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>

      {/* Users registered table card */}
      <div className="glass-card p-6 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              👥 Gestión de Usuarios
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Listado de usuarios registrados. Busca, edita contraseñas o elimina cuentas.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              placeholder="Buscar usuario por correo..."
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
            <svg className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-900 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                <th className="pb-3 pr-4">Correo Electrónico</th>
                <th className="pb-3 px-4">Fecha de Registro</th>
                <th className="pb-3 px-4">Último Acceso</th>
                <th className="pb-3 pl-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/40 text-slate-300">
              {loadingAdminData ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">Cargando lista de usuarios...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    {adminSearch ? 'No se encontraron usuarios que coincidan con la búsqueda.' : 'No hay usuarios registrados.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-950/20 transition-colors">
                    <td className="py-3.5 pr-4 font-extrabold text-slate-200">{u.email}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {new Date(u.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setResetUser(u)}
                          className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-900 border border-slate-850 text-amber-400 hover:bg-slate-850 hover:border-slate-700 transition cursor-pointer"
                          title="Cambiar Contraseña"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m-9 5a5 5 0 01-3.75 3.75L3 21l3.25-3.25A5 5 0 0112 13v-1l4-4h2.5M16 6a2 2 0 11-4 0 2 2 0 014 0z"></path>
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteUser(u)}
                          className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-900 border border-slate-850 text-rose-450 hover:bg-slate-850 hover:border-slate-700 transition cursor-pointer"
                          title="Eliminar Usuario"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm glass-card p-6 border border-slate-800 shadow-2xl relative">
            <h4 className="text-base font-extrabold text-white mb-2">🔑 Cambiar Contraseña</h4>
            <p className="text-xs text-slate-400 mb-4">
              Estás cambiando la contraseña del usuario <span className="text-slate-200 font-extrabold">{resetUser.email}</span>.
            </p>
            <form onSubmit={onResetPassword}>
              <div className="mb-4">
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">Nueva Contraseña</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-850 text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setResetUser(null); setNewPassword('') }}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-xs font-bold text-slate-400 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
                >
                  {resettingPassword ? 'Cambiando...' : 'Cambiar Clave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm glass-card p-6 border border-slate-800/85 shadow-2xl relative">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
            <h4 className="text-base font-extrabold text-white mb-2">⚠️ ¿Eliminar Usuario permanentemente?</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Esta acción eliminará de forma irreversible al usuario <span className="text-slate-200 font-extrabold">{deleteUser.email}</span>. Todas sus predicciones y estadísticas serán eliminadas permanentemente.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-xs font-bold text-slate-400 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onDeleteUser}
                disabled={deletingUser}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
              >
                {deletingUser ? 'Eliminando...' : 'Eliminar Cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
