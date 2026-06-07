'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import type { Match, Prediction } from '../lib/types'
import { groupsData } from '../lib/groupsData'
import { tTeam } from '../lib/translations'
import { getUserRank } from '../lib/getUserRank'
import { MatchCard } from '../components/MatchCard'
import { GroupsView } from '../components/GroupsView'
import { ScheduleView } from '../components/ScheduleView'
import { PhasesView } from '../components/PhasesView'
import { H2HView } from '../components/H2HView'
import { StatsView } from '../components/StatsView'
import { AdminView } from '../components/AdminView'
import { FireEffect } from '../components/FireEffect'

const fallbackNews = [
  { title: "Mundial 2026: La gran cita en Norteamérica con 48 selecciones", source: "FIFA", link: "https://www.fifa.com" },
  { title: "Estadio Azteca abrirá el torneo inaugural de la Copa Mundial", source: "Récord", link: "https://www.fifa.com" },
  { title: "Los Ángeles y Nueva York listos para recibir las semifinales y final", source: "ESPN", link: "https://www.fifa.com" },
  { title: "Canadá se prepara para recibir la acción mundialista en Toronto y Vancouver", source: "Fox Sports", link: "https://www.fifa.com" },
  { title: "Fifa anuncia calendario oficial para los 104 partidos del torneo", source: "Marca", link: "https://www.fifa.com" },
  { title: "Nuevas reglas y formatos: Grupos de 4 equipos confirmados", source: "FIFA", link: "https://www.fifa.com" },
]

const WORLD_CUP_START = new Date('2026-06-11T00:00:00')

export default function DashboardPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('Usuario')
  const [userEmail, setUserEmail] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [navDropdownOpen, setNavDropdownOpen] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'finished'>('all')
  const [seeding, setSeeding] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [emulatingWorldCup, setEmulatingWorldCup] = useState(false)
  const [seedingDummies, setSeedingDummies] = useState(false)
  const [deletingDummies, setDeletingDummies] = useState(false)
  const [adminMode, setAdminMode] = useState(false)
  const [leaderboard, setLeaderboard] = useState<{ username: string; total_points: number; predictions_count: number }[]>([])
  const [phaseLeaderboard, setPhaseLeaderboard] = useState<{
    username: string;
    fase1: number;
    fase2: number;
    fase3: number;
    fase4: number;
    fase5: number;
    fase6: number;
    total_points: number;
  }[]>([])
  const [news, setNews] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'predictions' | 'schedule' | 'groups' | 'phases' | 'h2h' | 'stats' | 'admin'>('predictions')
  const [activeGroupIndex, setActiveGroupIndex] = useState(0)
  const [activeScheduleDayIndex, setActiveScheduleDayIndex] = useState(0)
  const [activePredictionsDayIndex, setActivePredictionsDayIndex] = useState(0)

  // Close dropdowns on outside click
  useEffect(() => {
    if (!dropdownOpen && !navDropdownOpen) return
    const handleClick = () => { setDropdownOpen(false); setNavDropdownOpen(false) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [dropdownOpen, navDropdownOpen])

  // Keyboard navigation for groups carousel
  useEffect(() => {
    if (viewMode !== 'groups') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setActiveGroupIndex((prev) => (prev === 0 ? groupsData.length - 1 : prev - 1))
      else if (e.key === 'ArrowRight') setActiveGroupIndex((prev) => (prev === groupsData.length - 1 ? 0 : prev + 1))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewMode])

  // Keyboard navigation for schedule carousel
  useEffect(() => {
    if (viewMode !== 'schedule') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setActiveScheduleDayIndex((prev) => (prev === 0 ? prev : prev - 1))
      else if (e.key === 'ArrowRight') setActiveScheduleDayIndex((prev) => prev + 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewMode])

  // Set schedule day to current tournament day when switching to schedule tab
  useEffect(() => {
    if (viewMode !== 'schedule' || matches.length === 0) return
    const dayMap: Record<string, boolean> = {}
    matches.forEach((m) => { dayMap[new Date(m.match_date).toISOString().split('T')[0]] = true })
    const sortedKeys = Object.keys(dayMap).sort()
    const todayKey = new Date().toISOString().split('T')[0]
    let idx = sortedKeys.findIndex(k => k === todayKey)
    if (idx === -1) { idx = sortedKeys.findIndex(k => k >= todayKey); if (idx === -1) idx = 0 }
    setActiveScheduleDayIndex(idx)
  }, [viewMode, matches])

  // Set predictions day to current tournament day when switching to predictions tab
  useEffect(() => {
    if (viewMode !== 'predictions' || matches.length === 0) return
    const dayMap: Record<string, boolean> = {}
    matches.forEach((m) => { dayMap[new Date(m.match_date).toISOString().split('T')[0]] = true })
    const sortedKeys = Object.keys(dayMap).sort()
    const todayKey = new Date().toISOString().split('T')[0]
    let idx = sortedKeys.findIndex(k => k === todayKey)
    if (idx === -1) { idx = sortedKeys.findIndex(k => k >= todayKey); if (idx === -1) idx = 0 }
    setActivePredictionsDayIndex(idx)
  }, [viewMode, matches])

  // Admin Panel states
  const [adminUsers, setAdminUsers] = useState<{ id: string; email: string; created_at: string; last_sign_in_at: string | null }[]>([])
  const [loginStats, setLoginStats] = useState<{ login_day: string; active_users: number }[]>([])
  const [loadingAdminData, setLoadingAdminData] = useState(false)
  const [adminSearch, setAdminSearch] = useState('')
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)
  const [dismissedMatchId, setDismissedMatchId] = useState<number | null>(null)
  const [h2hRival, setH2hRival] = useState('')
  const [changePwCurrent, setChangePwCurrent] = useState('')
  const [changePwNew, setChangePwNew] = useState('')
  const [changePwMsg, setChangePwMsg] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' })
  const [changingPw, setChangingPw] = useState(false)

  // Password reset modal states
  const [resetUser, setResetUser] = useState<{ id: string; email: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)

  // Delete user modal states
  const [deleteUser, setDeleteUser] = useState<{ id: string; email: string } | null>(null)
  const [deletingUser, setDeletingUser] = useState(false)
  const [sendingDailyEmail, setSendingDailyEmail] = useState(false)
  const [dailyEmailDate, setDailyEmailDate] = useState(new Date().toISOString().split('T')[0])

  const logUserLogin = async (uid: string, email: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { error: upsertErr } = await supabase.from('user_logins').upsert({
        user_id: uid,
        email: email,
        login_date: today
      }, { onConflict: 'user_id,login_date' })
      if (upsertErr) console.warn('Could not log login:', upsertErr)
    } catch (err) {
      console.error('Error logging user login:', err)
    }
  }

  const fetchAdminData = async () => {
    setLoadingAdminData(true)
    setError('')
    try {
      const { data: usersData, error: usersErr } = await supabase.rpc('admin_get_users')
      if (usersErr) throw usersErr
      setAdminUsers(usersData || [])

      const { data: statsData, error: statsErr } = await supabase.rpc('admin_get_login_stats')
      if (statsErr) throw statsErr

      const mappedStats = (statsData || []).map((s: any) => ({
        login_day: s.login_day,
        active_users: parseInt(s.active_users) || 0
      }))
      setLoginStats(mappedStats)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al cargar datos de administración.')
    } finally {
      setLoadingAdminData(false)
    }
  }

  useEffect(() => {
    if (viewMode === 'admin') fetchAdminData()
  }, [viewMode])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetUser || !newPassword) return
    if (newPassword.length < 6) { alert('La contraseña debe tener al menos 6 caracteres.'); return }
    setResettingPassword(true)
    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_reset_user_password', {
        target_user_id: resetUser.id,
        new_password: newPassword
      })
      if (rpcErr) throw rpcErr
      alert(data || 'Contraseña restablecida con éxito.')
      setResetUser(null)
      setNewPassword('')
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error al restablecer la contraseña.')
    } finally {
      setResettingPassword(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteUser) return
    setDeletingUser(true)
    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_delete_user', { target_user_id: deleteUser.id })
      if (rpcErr) throw rpcErr
      alert(data || 'Usuario eliminado con éxito.')
      setDeleteUser(null)
      await fetchAdminData()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error al eliminar el usuario.')
    } finally {
      setDeletingUser(false)
    }
  }

  const handleSendDailyEmail = async () => {
    setSendingDailyEmail(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const res = await fetch('/api/send-daily-results', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dailyEmailDate })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      alert(`¡Correo enviado a ${data.sent_to} usuario${data.sent_to !== 1 ? 's' : ''}!`)
    } catch (err: any) {
      alert(err.message || 'Error al enviar correos.')
    } finally {
      setSendingDailyEmail(false)
    }
  }

  const getCompleteStats = () => {
    const complete: { dateStr: string; displayDate: string; count: number }[] = []
    const now = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const displayDate = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
      const found = loginStats.find(s => s.login_day === dateStr)
      complete.push({ dateStr, displayDate, count: found ? found.active_users : 0 })
    }
    return complete
  }

  useEffect(() => {
    setMounted(true)

    const checkSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) { setError(sessionError.message); setLoading(false); return }
      if (!session) { router.push('/login'); return }

      const user = session.user
      setUserId(user.id)
      if (user.email) {
        setUserEmail(user.email)
        const namePart = user.email.split('@')[0]
        setUsername(namePart.charAt(0).toUpperCase() + namePart.slice(1))
        if (namePart.toLowerCase() === 'admin') setAdminMode(true)
        logUserLogin(user.id, user.email)
      }

      await loadMatchesAndPredictions(user.id)
      setLoading(false)
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) router.push('/login')
    })

    return () => { subscription?.unsubscribe() }
  }, [router])

  useEffect(() => {
    const loadNews = async () => {
      try {
        const res = await fetch('/api/news')
        if (res.ok) {
          const data = await res.json()
          if (data.news && data.news.length > 0) setNews(data.news)
        }
      } catch (err) {
        console.error('Failed to load news:', err)
      }
    }
    loadNews()
  }, [])

  const loadMatchesAndPredictions = async (uid: string) => {
    try {
      const { data: matchesData, error: matchesErr } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: true })
      if (matchesErr) throw matchesErr

      const { data: predictionsData, error: predictionsErr } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', uid)
      if (predictionsErr) throw predictionsErr

      setMatches(matchesData || [])
      const predMap: Record<number, Prediction> = {}
      if (predictionsData) predictionsData.forEach((pred) => { predMap[pred.match_id] = pred as Prediction })
      setPredictions(predMap)

      const { data: leaderboardData, error: leaderboardErr } = await supabase.rpc('get_leaderboard')
      if (leaderboardErr) console.error('Error fetching leaderboard:', leaderboardErr)
      else setLeaderboard(leaderboardData || [])

      const { data: phaseLeaderboardData, error: phaseLeaderboardErr } = await supabase.rpc('get_leaderboard_by_phase')
      if (phaseLeaderboardErr) console.error('Error fetching phase leaderboard:', phaseLeaderboardErr)
      else setPhaseLeaderboard(phaseLeaderboardData || [])
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al cargar los partidos de la base de datos.')
    }
  }

  const handleSyncMatches = async () => {
    if (!userId) return
    setSyncing(true)
    setError('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('No se pudo encontrar la sesión del usuario.')
      const res = await fetch('/api/sync-matches', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
      if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.error || 'Error al sincronizar partidos.') }
      const data = await res.json()
      await loadMatchesAndPredictions(userId)
      alert(`¡Sincronización exitosa! Se actualizaron ${data.count} partidos del Mundial.`)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error durante la sincronización.')
    } finally {
      setSyncing(false)
    }
  }

  const handleWorldCupEmulation = async () => {
    if (!userId) return
    setEmulatingWorldCup(true)
    setError('')
    try {
      const { data, error: rpcError } = await supabase.rpc('emulate_world_cup')
      if (rpcError) throw rpcError
      await loadMatchesAndPredictions(userId)
      alert(data || '¡Emulación completa del Mundial finalizada con éxito!')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al emular el Mundial.')
    } finally {
      setEmulatingWorldCup(false)
    }
  }

  const handleSeedDummies = async () => {
    if (!userId) return
    setSeedingDummies(true)
    setError('')
    try {
      const { data, error: rpcError } = await supabase.rpc('seed_dummies_and_predictions')
      if (rpcError) throw rpcError
      await loadMatchesAndPredictions(userId)
      alert(data || '¡Usuarios dummy y pronósticos creados con éxito!')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al crear usuarios dummy.')
    } finally {
      setSeedingDummies(false)
    }
  }

  const handleDeleteDummiesAndTests = async () => {
    if (!userId) return
    if (!confirm('¿Estás seguro de que deseas eliminar los usuarios dummy, reiniciar la emulación del mundial y borrar todos los datos de prueba?')) return
    setDeletingDummies(true)
    setError('')
    try {
      const { error: resetErr } = await supabase.rpc('reset_world_cup_emulation')
      if (resetErr) throw resetErr
      const { data, error: rpcError } = await supabase.rpc('delete_dummies_and_tests')
      if (rpcError) throw rpcError
      await loadMatchesAndPredictions(userId)
      alert(data || '¡Emulación reiniciada y dummies eliminados con éxito!')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al eliminar dummies y pruebas.')
    } finally {
      setDeletingDummies(false)
    }
  }

  const handleMatchUpdate = async (updatedMatch: Match) => {
    setMatches((current) => current.map((m) => (m.id === updatedMatch.id ? updatedMatch : m)))
    if (userId) {
      const { data: leaderboardData, error: lError } = await supabase.rpc('get_leaderboard')
      if (!lError && leaderboardData) setLeaderboard(leaderboardData)
      const { data: predictionsData } = await supabase.from('predictions').select('*').eq('user_id', userId)
      if (predictionsData) {
        const predMap: Record<number, Prediction> = {}
        predictionsData.forEach((p) => { predMap[p.match_id] = p })
        setPredictions(predMap)
      }
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const seedDemoMatches = async () => {
    if (!userId) return
    setSeeding(true)
    setError('')
    const now = new Date()
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const futureDateFar = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
    const futureDateNear = new Date(now.getTime() + 45 * 60 * 1000).toISOString()
    const futureDateMid = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString()
    const demoMatches = [
      { home_team: 'Argentina', away_team: 'Francia', match_date: pastDate, home_score: 3, away_score: 3, status: 'finished' },
      { home_team: 'Brasil', away_team: 'Alemania', match_date: pastDate, home_score: 2, away_score: 1, status: 'finished' },
      { home_team: 'España', away_team: 'Italia', match_date: futureDateFar, home_score: null, away_score: null, status: 'pending' },
      { home_team: 'Inglaterra', away_team: 'Portugal', match_date: futureDateNear, home_score: null, away_score: null, status: 'pending' },
      { home_team: 'México', away_team: 'Uruguay', match_date: futureDateMid, home_score: null, away_score: null, status: 'pending' },
    ]
    try {
      const { error: seedErr } = await supabase.from('matches').insert(demoMatches)
      if (seedErr) throw seedErr
      await loadMatchesAndPredictions(userId)
    } catch (err: any) {
      console.error(err)
      setError('Error al sembrar partidos: ' + err.message)
    } finally {
      setSeeding(false)
    }
  }

  // Derived values
  const totalPoints = Object.values(predictions).reduce((sum, pred) => sum + (pred.points || 0), 0)
  const predictedCount = Object.keys(predictions).length
  const currentStreak = (() => {
    const finishedWithPred = matches
      .filter(m => m.status === 'finished' && predictions[m.id])
      .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
    let streak = 0
    for (const m of finishedWithPred) {
      if ((predictions[m.id]?.points || 0) > 0) streak++
      else break
    }
    return streak
  })()
  const isOnFire = currentStreak >= 3

  const filteredMatches = matches.filter((match) => {
    if (filter === 'pending') return match.status === 'pending'
    if (filter === 'finished') return match.status === 'finished'
    return true
  })

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-slate-100 p-4">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando Quiniela...</p>
      </div>
    )
  }

  const upcomingMatch = matches.find((m) => {
    if (m.status === 'finished') return false
    const diff = new Date(m.match_date).getTime() - Date.now()
    return diff > 0 && diff <= 60 * 60 * 1000
  })

  return (
    <div className="relative min-h-screen bg-transparent text-white pb-32 overflow-x-hidden">
      {/* Upcoming Match Overlay Bubble */}
      {upcomingMatch && dismissedMatchId !== upcomingMatch.id && (() => {
        const diff = new Date(upcomingMatch.match_date).getTime() - Date.now()
        const mins = Math.ceil(diff / 60000)
        return (
          <div className="fixed top-4 right-4 z-[100] animate-bounce-slow max-w-xs">
            <div className="bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-4 shadow-2xl shadow-amber-500/10">
              <button onClick={() => setDismissedMatchId(upcomingMatch.id)} className="absolute top-2 right-2 text-slate-500 hover:text-white text-xs cursor-pointer">✕</button>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-400">⚡ Próximo partido</span>
              </div>
              <p className="text-sm font-bold text-white">{tTeam(upcomingMatch.home_team)} vs {tTeam(upcomingMatch.away_team)}</p>
              <p className="text-xs text-slate-400 mt-1">
                Inicia en <span className="text-amber-400 font-bold">{mins} min</span>
                {mins <= 5 && <span className="text-rose-400 font-bold ml-1">• Predicciones bloqueadas</span>}
              </p>
            </div>
          </div>
        )
      })()}

      {/* Stadium/Field Backdrop */}
      <div className="absolute top-0 inset-x-0 h-80 bg-[radial-gradient(circle_at_50%_-20%,rgba(0,212,255,0.15),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:linear-gradient(to_bottom,white_30%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* Main Wrapper */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* Navigation / Header */}
        <header className="flex justify-between items-center py-6 border-b border-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/15">
              <svg className="w-5 h-5 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
              </svg>
            </div>
            <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
              QUINIELA
            </span>
          </div>

          <div className="flex items-center gap-3">
            {username.toLowerCase() === 'admin' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300 hover:border-slate-700 transition text-sm font-semibold cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  <span className="hidden sm:inline">Admin</span>
                  <svg className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl shadow-black/40 z-50 overflow-hidden animate-fadeIn">
                    <button type="button" onClick={() => { handleSyncMatches(); setDropdownOpen(false) }} disabled={syncing} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-slate-800/60 transition disabled:opacity-50 cursor-pointer">
                      {syncing ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7H16"></path></svg>}
                      <span className="font-semibold">Sincronizar API</span>
                    </button>
                    <button type="button" onClick={() => { handleWorldCupEmulation(); setDropdownOpen(false) }} disabled={emulatingWorldCup} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-amber-400 hover:bg-slate-800/60 transition disabled:opacity-50 cursor-pointer">
                      {emulatingWorldCup ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>}
                      <span className="font-semibold">Emular Mundial</span>
                    </button>
                    <button type="button" onClick={() => { handleSeedDummies(); setDropdownOpen(false) }} disabled={seedingDummies} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-slate-800/60 transition disabled:opacity-50 cursor-pointer">
                      {seedingDummies ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>}
                      <span className="font-semibold">Crear Dummies</span>
                    </button>
                    <div className="border-t border-slate-800"></div>
                    <button type="button" onClick={() => { handleDeleteDummiesAndTests(); setDropdownOpen(false) }} disabled={deletingDummies} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-400 hover:bg-slate-800/60 transition disabled:opacity-50 cursor-pointer">
                      {deletingDummies ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>}
                      <span className="font-semibold">Eliminar Pruebas</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Logout Button */}
            <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition text-sm font-semibold cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </header>

        {/* Navigation Dropdown */}
        <div className="relative mt-6 mb-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setNavDropdownOpen(!navDropdownOpen) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white hover:border-slate-700 transition text-sm font-bold cursor-pointer"
          >
            <span>{viewMode === 'predictions' ? '🔮 Mis Pronósticos' : viewMode === 'schedule' ? '📅 Calendario' : viewMode === 'groups' ? '🏆 Grupos del Mundial' : viewMode === 'phases' ? '📊 Tabla por Fases' : viewMode === 'h2h' ? '🥊 Cara a Cara' : viewMode === 'stats' ? '📈 Mis Estadísticas' : '🔧 Panel Admin'}</span>
            <svg className={`w-3 h-3 transition-transform ${navDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>

          {navDropdownOpen && (
            <div className="absolute left-0 mt-2 w-60 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl shadow-black/40 z-50 overflow-hidden animate-fadeIn">
              {[
                { key: 'predictions' as const, label: '🔮 Mis Pronósticos' },
                { key: 'schedule' as const, label: '📅 Calendario' },
                { key: 'groups' as const, label: '🏆 Grupos del Mundial' },
                { key: 'phases' as const, label: '📊 Tabla por Fases' },
                { key: 'h2h' as const, label: '🥊 Cara a Cara' },
                { key: 'stats' as const, label: '📈 Mis Estadísticas' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => { setViewMode(item.key); setNavDropdownOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-800/60 transition cursor-pointer ${viewMode === item.key ? 'text-primary font-extrabold' : 'text-slate-300 font-semibold'}`}
                >
                  {item.label}
                </button>
              ))}
              {username.toLowerCase() === 'admin' && (
                <>
                  <div className="border-t border-slate-800"></div>
                  <button
                    type="button"
                    onClick={() => { setViewMode('admin'); setNavDropdownOpen(false) }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-800/60 transition cursor-pointer ${viewMode === 'admin' ? 'text-primary font-extrabold' : 'text-amber-400 font-semibold'}`}
                  >
                    🔧 Panel Admin
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* ─── PREDICTIONS VIEW ─── */}
        {viewMode === 'predictions' && (
          <>
            {/* User Stats Card */}
            <section className="mt-8 glass-card p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <p className="text-xs uppercase font-extrabold tracking-widest text-primary">Bienvenido de vuelta</p>
                  <h2 className="text-3xl font-black tracking-tight text-white mt-1">¡Hola, {username}!</h2>
                  <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold">
                      <span>{getUserRank(totalPoints).icon}</span>
                      <span className="text-slate-200">{getUserRank(totalPoints).label}</span>
                    </span>
                    <span>Sigue prediciendo para subir de rango.</span>
                  </p>
                </div>

                {/* Score Metrics Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 min-w-[120px]">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 0h4m-4 0H8m0 0v13m0-13t2 2m-2-2L6 8M6 8V6a2 2 0 012-2h2m0 16a2 2 0 01-2-2v-1m2 3H6"></path></svg>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Puntos</span>
                      <span className="text-xl font-black text-amber-400">{totalPoints}</span>
                    </div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 min-w-[120px]">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pronósticos</span>
                      <span className="text-xl font-black text-slate-200">{predictedCount}/{matches.length}</span>
                    </div>
                  </div>
                  <div className={`relative overflow-hidden bg-slate-950/80 border rounded-2xl p-4 flex items-center gap-3 min-w-[120px] ${isOnFire ? 'border-orange-500/40 shadow-lg shadow-orange-500/10' : 'border-slate-800'}`}>
                    {isOnFire && <FireEffect />}
                    <div className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isOnFire ? 'bg-orange-500/20' : 'bg-slate-800'}`}>
                      {isOnFire ? '🔥' : '⚡'}
                    </div>
                    <div className="relative z-10">
                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Racha</span>
                      <span className={`text-xl font-black ${isOnFire ? 'text-orange-400' : 'text-slate-400'}`}>{currentStreak}</span>
                      {isOnFire && <span className="block text-[9px] font-bold text-orange-400 uppercase">On Fire!</span>}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Scoring Guide Accordion */}
            <section className="mt-6 bg-slate-900/20 border border-slate-900 rounded-2xl p-4">
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Reglas del Torneo y Puntuación
                  </span>
                  <span className="text-slate-500 group-open:rotate-180 transition-transform duration-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </span>
                </summary>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-3 border-t border-slate-900/60">
                  <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="font-extrabold text-amber-400 block text-sm">🏆 +5 Puntos</span><span className="text-slate-400 mt-1 block">Resultado Exacto</span><span className="text-slate-500 text-[10px] block mt-0.5">Ej: Predijiste 2-1, quedó 2-1.</span></div>
                  <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="font-extrabold text-emerald-400 block text-sm">⚽ +3 Puntos</span><span className="text-slate-400 mt-1 block">Ganador Correcto</span><span className="text-slate-500 text-[10px] block mt-0.5">Ej: Predijiste 2-0, quedó 1-0.</span></div>
                  <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="font-extrabold text-teal-400 block text-sm">🤝 +1 Punto</span><span className="text-slate-400 mt-1 block">Empate Correcto</span><span className="text-slate-500 text-[10px] block mt-0.5">Ej: Predijiste 1-1, quedó 2-2.</span></div>
                  <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800"><span className="font-extrabold text-slate-500 block text-sm">❌ 0 Puntos</span><span className="text-slate-400 mt-1 block">Resultado Incorrecto</span><span className="text-slate-500 text-[10px] block mt-0.5">Ej: Predijiste 1-0, quedó 1-2.</span></div>
                </div>
                <div className="mt-3 p-3 bg-orange-500/5 rounded-xl border border-orange-500/20">
                  <span className="font-extrabold text-orange-400 block text-sm">🔥 Racha On Fire — Multiplicador x1.5</span>
                  <span className="text-slate-400 mt-1 block text-xs">Si aciertas 3 o más partidos seguidos (ganador o resultado exacto), tus puntos se multiplican x1.5 mientras mantengas la racha.</span>
                  <span className="text-slate-500 text-[10px] block mt-1">Ej: Con racha de 3+, un resultado exacto da 8 pts en vez de 5, un ganador correcto da 5 pts en vez de 3.</span>
                </div>
              </details>
            </section>

            {/* Leaderboard Card */}
            <section className="mt-6 glass-card p-6">
              <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2 mb-4">🏆 Tabla de Posiciones</h3>
              <div className="space-y-2.5">
                {leaderboard.length === 0 ? (
                  <p className="text-xs text-slate-500">Aún no hay participantes en la tabla.</p>
                ) : (
                  leaderboard.slice(0, 10).map((row, index) => {
                    const isMe = row.username.toLowerCase() === username.toLowerCase()
                    return (
                      <div key={row.username} className={`flex items-center justify-between p-3.5 rounded-2xl border transition-colors ${isMe ? 'bg-primary/10 border-primary/30 text-primary font-bold' : 'bg-slate-950/40 border-slate-900 text-slate-300'}`}>
                        <div className="flex items-center gap-3">
                          <span className="w-6 text-xs font-black text-slate-500 text-center">#{index + 1}</span>
                          <span className="text-sm font-extrabold truncate flex items-center gap-1.5">
                            <span className="text-base">{getUserRank(Number(row.total_points)).icon}</span>
                            {row.username} {isMe && <span className="text-[10px] bg-primary text-slate-950 px-1.5 py-0.5 rounded font-black ml-1 uppercase">Tú</span>}
                            {isMe && isOnFire && <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-black ml-1 border border-orange-500/30">🔥 On Fire</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-500 font-bold">{row.predictions_count} pronós.</span>
                          <span className="text-sm font-black font-mono">{row.total_points} pts</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            {/* Matches Section Header & Filters */}
            <section className="mt-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">⚽ Partidos del Campeonato</h3>
                  {username.toLowerCase() === 'admin' && (
                    <button
                      type="button"
                      onClick={() => setAdminMode(!adminMode)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-[10px] uppercase font-black tracking-wider transition-all duration-300 cursor-pointer ${adminMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-lg shadow-amber-500/5 hover:bg-amber-500/30' : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      {adminMode ? 'Modo Admin Activo' : 'Entrar Modo Admin'}
                    </button>
                  )}
                </div>
              </div>

              {/* Day-by-day predictions navigation */}
              {(() => {
                const predDays: { dateKey: string; label: string; dayNum: number; matches: Match[] }[] = []
                const dayMap: Record<string, Match[]> = {}
                filteredMatches.forEach((m) => {
                  const key = new Date(m.match_date).toISOString().split('T')[0]
                  if (!dayMap[key]) dayMap[key] = []
                  dayMap[key].push(m)
                })
                Object.keys(dayMap).sort().forEach((key) => {
                  const d = new Date(key + 'T12:00:00')
                  const diffMs = d.getTime() - WORLD_CUP_START.getTime()
                  const dayNum = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
                  const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
                  predDays.push({ dateKey: key, label: label.charAt(0).toUpperCase() + label.slice(1), dayNum, matches: dayMap[key] })
                })

                const currentIdx = activePredictionsDayIndex < predDays.length ? activePredictionsDayIndex : 0
                const activeDay = predDays[currentIdx]

                return (
                  <>
                    {/* Filter Pill Controls */}
                    <div className="flex rounded-full bg-slate-900/80 p-1 border border-slate-800 text-xs w-fit mb-4">
                      {(['all', 'pending', 'finished'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => { setFilter(type); setActivePredictionsDayIndex(0) }}
                          className={`rounded-full px-4 py-2 font-bold tracking-wide transition-all cursor-pointer ${filter === type ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                          {type === 'all' ? 'Todos' : type === 'pending' ? 'Pendientes' : 'Finalizados'}
                        </button>
                      ))}
                    </div>

                    {predDays.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-center rounded-[32px] bg-slate-900/20 border border-slate-900">
                        <p className="text-slate-400 font-semibold">No se encontraron partidos en esta sección.</p>
                        {matches.length === 0 && (
                          <button type="button" onClick={seedDemoMatches} disabled={seeding} className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-black text-sm transition uppercase tracking-wider cursor-pointer shadow-lg shadow-primary/10">
                            {seeding ? 'Sembrando...' : 'Sembrar Partidos Demo'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Day Slider */}
                        <div className="mb-5 px-2">
                          <input type="range" min={0} max={predDays.length - 1} value={currentIdx} onChange={(e) => setActivePredictionsDayIndex(Number(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-800 accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-primary/30 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20" />
                          <div className="flex justify-between mt-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            <span>Día {predDays[0]?.dayNum > 0 ? predDays[0].dayNum : 1}</span>
                            <span className="text-primary font-black">{activeDay?.dayNum > 0 ? `Día ${activeDay.dayNum}` : ''} • {activeDay?.label} • {activeDay?.matches.length} partido{activeDay?.matches.length !== 1 ? 's' : ''}</span>
                            <span>Día {predDays[predDays.length - 1]?.dayNum > 0 ? predDays[predDays.length - 1].dayNum : predDays.length}</span>
                          </div>
                        </div>

                        {/* Match Cards for selected day */}
                        <div className="space-y-5">
                          {activeDay?.matches.map((match) => (
                            <MatchCard
                              key={match.id}
                              userId={userId!}
                              match={match}
                              prediction={predictions[match.id]}
                              isAdmin={username.toLowerCase() === 'admin'}
                              adminMode={adminMode}
                              onMatchUpdate={handleMatchUpdate}
                              onSave={async (savedPrediction) => {
                                setPredictions((current) => ({ ...current, [match.id]: savedPrediction }))
                              }}
                            />
                          ))}
                        </div>

                        {/* Mobile day navigation */}
                        <div className="flex justify-between items-center mt-6 px-2">
                          <button onClick={() => setActivePredictionsDayIndex(prev => (prev === 0 ? predDays.length - 1 : prev - 1))} className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                            Anterior
                          </button>
                          <span className="text-xs text-slate-450 font-semibold uppercase tracking-wider">{currentIdx + 1} / {predDays.length}</span>
                          <button onClick={() => setActivePredictionsDayIndex(prev => (prev === predDays.length - 1 ? 0 : prev + 1))} className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer">
                            Siguiente
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )
              })()}
            </section>
          </>
        )}

        {/* ─── SCHEDULE VIEW ─── */}
        {viewMode === 'schedule' && (
          <ScheduleView
            matches={matches}
            activeScheduleDayIndex={activeScheduleDayIndex}
            setActiveScheduleDayIndex={setActiveScheduleDayIndex}
          />
        )}

        {/* ─── GROUPS VIEW ─── */}
        {viewMode === 'groups' && (
          <GroupsView
            matches={matches}
            activeGroupIndex={activeGroupIndex}
            setActiveGroupIndex={setActiveGroupIndex}
          />
        )}

        {/* ─── PHASES VIEW ─── */}
        {viewMode === 'phases' && (
          <PhasesView
            phaseLeaderboard={phaseLeaderboard}
            username={username}
          />
        )}

        {/* ─── H2H VIEW ─── */}
        {viewMode === 'h2h' && (
          <H2HView
            leaderboard={leaderboard}
            username={username}
            totalPoints={totalPoints}
            predictedCount={predictedCount}
            h2hRival={h2hRival}
            setH2hRival={setH2hRival}
          />
        )}

        {/* ─── STATS VIEW ─── */}
        {viewMode === 'stats' && (
          <StatsView
            matches={matches}
            predictions={predictions}
            username={username}
            userEmail={userEmail}
            totalPoints={totalPoints}
            predictedCount={predictedCount}
            currentStreak={currentStreak}
            isOnFire={isOnFire}
            changePwCurrent={changePwCurrent}
            setChangePwCurrent={setChangePwCurrent}
            changePwNew={changePwNew}
            setChangePwNew={setChangePwNew}
            changePwMsg={changePwMsg}
            setChangePwMsg={setChangePwMsg}
            changingPw={changingPw}
            setChangingPw={setChangingPw}
          />
        )}

        {/* ─── ADMIN VIEW ─── */}
        {viewMode === 'admin' && (
          <AdminView
            adminUsers={adminUsers}
            loginStats={loginStats}
            loadingAdminData={loadingAdminData}
            adminSearch={adminSearch}
            setAdminSearch={setAdminSearch}
            hoveredBar={hoveredBar}
            setHoveredBar={setHoveredBar}
            sendingDailyEmail={sendingDailyEmail}
            setSendingDailyEmail={setSendingDailyEmail}
            dailyEmailDate={dailyEmailDate}
            setDailyEmailDate={setDailyEmailDate}
            resetUser={resetUser}
            setResetUser={setResetUser}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            resettingPassword={resettingPassword}
            deleteUser={deleteUser}
            setDeleteUser={setDeleteUser}
            deletingUser={deletingUser}
            onResetPassword={handleResetPassword}
            onDeleteUser={handleDeleteUser}
            onSendDailyEmail={handleSendDailyEmail}
            getCompleteStats={getCompleteStats}
          />
        )}

        {/* Medals & Achievements Banner */}
        {(() => {
          const medals: { icon: string; msg: string }[] = []
          if (currentStreak >= 5) medals.push({ icon: '🔥', msg: `¡Racha imparable! ${currentStreak} aciertos seguidos. Estás en modo bestia.` })
          else if (currentStreak >= 3) medals.push({ icon: '🔥', msg: `¡On Fire! Llevas ${currentStreak} aciertos consecutivos. x1.5 activado.` })
          if (leaderboard.length > 0 && leaderboard[0]?.username?.toLowerCase() === username.toLowerCase()) medals.push({ icon: '👑', msg: '¡Sos El Patrón! Vas primero en la tabla general.' })
          const samePointsUser = leaderboard.find(u => u.username.toLowerCase() !== username.toLowerCase() && Number(u.total_points) === totalPoints && totalPoints > 0)
          if (samePointsUser) medals.push({ icon: '⚔️', msg: `Empatado en puntos con ${samePointsUser.username}. ¡El próximo partido define!` })
          const recentFinished = matches.filter(m => m.status === 'finished' && predictions[m.id]).sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()).slice(0, 3)
          const allMissed = recentFinished.length === 3 && recentFinished.every(m => (predictions[m.id]?.points || 0) === 0)
          if (allMissed) medals.push({ icon: '🙈', msg: 'No pegaste ni una en los últimos 3... ¡Pase por sus productos Tosty!' })
          const todayKey = new Date().toISOString().split('T')[0]
          const todayMatches = matches.filter(m => new Date(m.match_date).toISOString().split('T')[0] === todayKey)
          const todayAllPredicted = todayMatches.length > 0 && todayMatches.every(m => predictions[m.id])
          if (todayAllPredicted && todayMatches.length > 0) medals.push({ icon: '✅', msg: `¡Todos los partidos de hoy pronosticados! ${todayMatches.length} de ${todayMatches.length}.` })
          if (totalPoints >= 15 && totalPoints < 20) medals.push({ icon: '👟', msg: '¡Te faltan pocos puntos para ser Mejenguero! Dale con todo.' })
          if (totalPoints >= 45 && totalPoints < 50) medals.push({ icon: '🦊', msg: '¡Casi sos Zorro Viejo! Un par de aciertos más y subes de rango.' })
          if (totalPoints >= 140 && totalPoints < 150) medals.push({ icon: '👑', msg: '¡A punto de ser El Patrón! La corona está cerca.' })
          if (leaderboard.length >= 2 && leaderboard[1]?.username?.toLowerCase() === username.toLowerCase()) medals.push({ icon: '🥈', msg: `Vas segundo, a ${Number(leaderboard[0].total_points) - totalPoints} puntos del líder. ¡A cerrar la brecha!` })
          const perfectCount = Object.values(predictions).filter(p => p.points === 5 || p.points === 8).length
          if (perfectCount >= 5) medals.push({ icon: '🎯', msg: `¡${perfectCount} resultados exactos! Tenés ojo clínico.` })
          else if (perfectCount >= 1) medals.push({ icon: '🎯', msg: `¡${perfectCount} resultado${perfectCount > 1 ? 's' : ''} exacto${perfectCount > 1 ? 's' : ''}! Seguí así.` })
          if (predictedCount === 0) medals.push({ icon: '💤', msg: 'Aún no tenés pronósticos. ¡No te duermas que arranca el mundial!' })
          if (medals.length === 0) return null
          return (
            <div className="fixed bottom-16 inset-x-0 z-40 bg-slate-950/90 border-t border-slate-800/60 backdrop-blur-sm">
              <div className="overflow-hidden h-7 flex items-center">
                <div className="flex gap-10 whitespace-nowrap animate-marquee-left hover:[animation-play-state:paused] cursor-default">
                  {[...medals, ...medals].map((m, idx) => (
                    <span key={idx} className="inline-flex items-center gap-2 text-[11px] text-slate-200 font-semibold">
                      <span className="text-base">{m.icon}</span>
                      <span>{m.msg}</span>
                      <span className="text-slate-700">|</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Google News RSS Ticker Footer */}
        <footer className="fixed bottom-0 inset-x-0 h-16 bg-slate-950/95 border-t border-slate-900/60 backdrop-blur-md z-50 flex flex-col justify-center py-1 select-none overflow-hidden">
          {/* Row 1 (scrolling left) */}
          <div className="relative w-full overflow-hidden flex items-center h-6">
            <div className="flex gap-8 whitespace-nowrap animate-marquee-left hover:[animation-play-state:paused] cursor-pointer">
              {(news.length > 0 ? news.slice(0, 15) : fallbackNews.slice(0, 6)).map((item, idx) => (
                <a key={`l1-${idx}`} href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[11px] text-slate-300 hover:text-primary transition-colors">
                  <span className="text-primary font-extrabold uppercase text-[9px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 shrink-0">{item.source || 'Fifa'}</span>
                  <span className="font-semibold">{item.title}</span>
                  <span className="text-slate-600">|</span>
                </a>
              ))}
              {(news.length > 0 ? news.slice(0, 15) : fallbackNews.slice(0, 6)).map((item, idx) => (
                <a key={`l1-dup-${idx}`} href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[11px] text-slate-300 hover:text-primary transition-colors">
                  <span className="text-primary font-extrabold uppercase text-[9px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 shrink-0">{item.source || 'Fifa'}</span>
                  <span className="font-semibold">{item.title}</span>
                  <span className="text-slate-600">|</span>
                </a>
              ))}
            </div>
          </div>
          {/* Row 2 (scrolling right) */}
          <div className="relative w-full overflow-hidden flex items-center h-6 mt-0.5">
            <div className="flex gap-8 whitespace-nowrap animate-marquee-right hover:[animation-play-state:paused] cursor-pointer">
              {(news.length > 15 ? news.slice(15, 30) : fallbackNews.slice(0, 6)).map((item, idx) => (
                <a key={`l2-${idx}`} href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[11px] text-slate-300 hover:text-secondary transition-colors">
                  <span className="text-secondary font-extrabold uppercase text-[9px] px-1.5 py-0.5 rounded bg-secondary/10 border border-secondary/20 shrink-0">{item.source || 'Fifa'}</span>
                  <span className="font-semibold">{item.title}</span>
                  <span className="text-slate-600">|</span>
                </a>
              ))}
              {(news.length > 15 ? news.slice(15, 30) : fallbackNews.slice(0, 6)).map((item, idx) => (
                <a key={`l2-dup-${idx}`} href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[11px] text-slate-300 hover:text-secondary transition-colors">
                  <span className="text-secondary font-extrabold uppercase text-[9px] px-1.5 py-0.5 rounded bg-secondary/10 border border-secondary/20 shrink-0">{item.source || 'Fifa'}</span>
                  <span className="font-semibold">{item.title}</span>
                  <span className="text-slate-600">|</span>
                </a>
              ))}
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}
