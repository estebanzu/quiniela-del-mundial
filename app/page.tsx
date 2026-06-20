'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import NotificationBell from '../components/NotificationBell'
import { TriviaView } from '../components/TriviaView'
import LiveMatchesView from '../components/LiveMatchesView'
import { MatchCard } from '../components/MatchCard'
import { MatchChat } from '../components/MatchChat'
import { toBlob } from 'html-to-image'
import { BADGES_CATALOG, type Badge } from '../lib/badges'
import BadgeUnlockOverlay from '../components/BadgeUnlockOverlay'
import NewsInfoView from '../components/NewsInfoView'
import LiveMatchTicker from '../components/LiveMatchTicker'

const TZ = 'America/Costa_Rica' // UTC-6

// Get YYYY-MM-DD key in the target timezone
function dateKeyInTZ(d: Date): string {
  return d.toLocaleDateString('sv-SE', { timeZone: TZ }) // sv-SE gives YYYY-MM-DD format
}

function todayKeyInTZ(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ })
}

type Match = {
  id: number
  home_team: string
  away_team: string
  match_date: string
  stage_group?: string
  venue?: string
  home_score: number | null
  away_score: number | null
  status: 'pending' | 'live' | 'finished'
}

type Prediction = {
  id: number
  user_id: string
  match_id: number
  predicted_home: number
  predicted_away: number
  points: number
  created_at: string
}

const groupsData = [
  {
    name: 'Grupo A',
    teams: [
      { name: 'México', flag: '🇲🇽' },
      { name: 'Corea del Sur', flag: '🇰🇷' },
      { name: 'Sudáfrica', flag: '🇿🇦' },
      { name: 'Chequia', flag: '🇨🇿' }
    ]
  },
  {
    name: 'Grupo B',
    teams: [
      { name: 'Canadá', flag: '🇨🇦' },
      { name: 'Suiza', flag: '🇨🇭' },
      { name: 'Qatar', flag: '🇶🇦' },
      { name: 'Bosnia-Herzegovina', flag: '🇧🇦' }
    ]
  },
  {
    name: 'Grupo C',
    teams: [
      { name: 'Brasil', flag: '🇧🇷' },
      { name: 'Marruecos', flag: '🇲🇦' },
      { name: 'Escocia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
      { name: 'Haití', flag: '🇭🇹' }
    ]
  },
  {
    name: 'Grupo D',
    teams: [
      { name: 'EE. UU.', flag: '🇺🇸' },
      { name: 'Paraguay', flag: '🇵🇾' },
      { name: 'Australia', flag: '🇦🇺' },
      { name: 'Turquía', flag: '🇹🇷' }
    ]
  },
  {
    name: 'Grupo E',
    teams: [
      { name: 'Alemania', flag: '🇩🇪' },
      { name: 'Ecuador', flag: '🇪🇨' },
      { name: 'Costa de Marfil', flag: '🇨🇮' },
      { name: 'Curazao', flag: '🇨🇼' }
    ]
  },
  {
    name: 'Grupo F',
    teams: [
      { name: 'Países Bajos', flag: '🇳🇱' },
      { name: 'Japón', flag: '🇯🇵' },
      { name: 'Túnez', flag: '🇹🇳' },
      { name: 'Suecia', flag: '🇸🇪' }
    ]
  },
  {
    name: 'Grupo G',
    teams: [
      { name: 'Bélgica', flag: '🇧🇪' },
      { name: 'Irán', flag: '🇮🇷' },
      { name: 'Egipto', flag: '🇪🇬' },
      { name: 'Nueva Zelanda', flag: '🇳🇿' }
    ]
  },
  {
    name: 'Grupo H',
    teams: [
      { name: 'España', flag: '🇪🇸' },
      { name: 'Uruguay', flag: '🇺🇾' },
      { name: 'Arabia Saudita', flag: '🇸🇦' },
      { name: 'Cabo Verde', flag: '🇨🇻' }
    ]
  },
  {
    name: 'Grupo I',
    teams: [
      { name: 'Francia', flag: '🇫🇷' },
      { name: 'Senegal', flag: '🇸🇳' },
      { name: 'Noruega', flag: '🇳🇴' },
      { name: 'Irak', flag: '🇮🇶' }
    ]
  },
  {
    name: 'Grupo J',
    teams: [
      { name: 'Argentina', flag: '🇦🇷' },
      { name: 'Austria', flag: '🇦🇹' },
      { name: 'Argelia', flag: '🇩🇿' },
      { name: 'Jordania', flag: '🇯🇴' }
    ]
  },
  {
    name: 'Grupo K',
    teams: [
      { name: 'Portugal', flag: '🇵🇹' },
      { name: 'Colombia', flag: '🇨🇴' },
      { name: 'Uzbekistán', flag: '🇺🇿' },
      { name: 'R. D. del Congo', flag: '🇨🇩' }
    ]
  },
  {
    name: 'Grupo L',
    teams: [
      { name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { name: 'Croacia', flag: '🇭🇷' },
      { name: 'Panamá', flag: '🇵🇦' },
      { name: 'Ghana', flag: '🇬🇭' }
    ]
  }
]

const DB_TEAM_TO_SPANISH: Record<string, string> = {
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

const tTeam = (team: string): string => DB_TEAM_TO_SPANISH[team] || team

type TeamStandings = {
  name: string
  flag: string
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  gd: number
  pts: number
}

function getGroupStandings(groupName: string, matchesList: Match[]): TeamStandings[] {
  const group = groupsData.find(g => g.name === groupName)
  if (!group) return []

  const standings: Record<string, TeamStandings> = {}

  group.teams.forEach(team => {
    standings[team.name] = {
      name: team.name,
      flag: team.flag,
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      gf: 0,
      gc: 0,
      gd: 0,
      pts: 0
    }
  })

  // Filter matches for this group
  const groupMatches = matchesList.filter(m => {
    const mGroup = m.stage_group || ''
    return mGroup.trim().toLowerCase() === groupName.trim().toLowerCase()
  })

  // Compute standings stats
  groupMatches.forEach(match => {
    if (match.status === 'finished' && match.home_score !== null && match.away_score !== null) {
      const homeName = DB_TEAM_TO_SPANISH[match.home_team] || match.home_team
      const awayName = DB_TEAM_TO_SPANISH[match.away_team] || match.away_team

      const homeStats = standings[homeName]
      const awayStats = standings[awayName]

      if (homeStats && awayStats) {
        homeStats.pj += 1
        awayStats.pj += 1

        homeStats.gf += match.home_score
        homeStats.gc += match.away_score
        awayStats.gf += match.away_score
        awayStats.gc += match.home_score

        if (match.home_score > match.away_score) {
          homeStats.pg += 1
          homeStats.pts += 3
          awayStats.pp += 1
        } else if (match.home_score < match.away_score) {
          awayStats.pg += 1
          awayStats.pts += 3
          homeStats.pp += 1
        } else {
          homeStats.pe += 1
          awayStats.pe += 1
          homeStats.pts += 1
          awayStats.pts += 1
        }

        homeStats.gd = homeStats.gf - homeStats.gc
        awayStats.gd = awayStats.gf - awayStats.gc
      }
    }
  })

  // Sort according to FIFA rules: points, GD, GF, alphabetical name
  return Object.values(standings).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.gd !== a.gd) return b.gd - a.gd
    if (b.gf !== a.gf) return b.gf - a.gf
    return a.name.localeCompare(b.name)
  })
}

const fallbackNews = [
  { title: "Mundial 2026: La gran cita en Norteamérica con 48 selecciones", source: "FIFA", link: "https://www.fifa.com" },
  { title: "Estadio Azteca abrirá el torneo inaugural de la Copa Mundial", source: "Récord", link: "https://www.fifa.com" },
  { title: "Los Ángeles y Nueva York listos para recibir las semifinales y final", source: "ESPN", link: "https://www.fifa.com" },
  { title: "Canadá se prepara para recibir la acción mundialista en Toronto y Vancouver", source: "Fox Sports", link: "https://www.fifa.com" },
  { title: "Fifa anuncia calendario oficial para los 104 partidos del torneo", source: "Marca", link: "https://www.fifa.com" },
  { title: "Nuevas reglas y formatos: Grupos de 4 equipos confirmados", source: "FIFA", link: "https://www.fifa.com" },
]

export default function DashboardPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('Usuario')
  const [userEmail, setUserEmail] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [navDropdownOpen, setNavDropdownOpen] = useState(false)
  
  // Custom user avatar states
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false)
  const [avatarStyle, setAvatarStyle] = useState<'initials' | 'fifa' | 'gold'>('initials')
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({})

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('avatar_style') as 'initials' | 'fifa' | 'gold' | null
      if (stored) setAvatarStyle(stored)
    }
  }, [])

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
  const [leaderboard, setLeaderboard] = useState<{ username: string; total_points: number; predictions_count: number; rank_change?: number | null }[]>([])
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
  const [viewMode, setViewMode] = useState<'predictions' | 'schedule' | 'groups' | 'phases' | 'h2h' | 'stats' | 'trivia' | 'live_matches' | 'badges' | 'news_info' | 'admin'>('predictions')
  const [activeGroupIndex, setActiveGroupIndex] = useState(0)
  const [activeScheduleDayIndex, setActiveScheduleDayIndex] = useState(0)
  const [activePredictionsDayIndex, setActivePredictionsDayIndex] = useState(0)
  const [activeChat, setActiveChat] = useState<{ id: number; homeTeam: string; awayTeam: string } | null>(null)
  const [chatMinimized, setChatMinimized] = useState(false)

  // PWA installation states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isSafari, setIsSafari] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  // Gamification badges states
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([])
  const [unviewedBadgesQueue, setUnviewedBadgesQueue] = useState<Badge[]>([])
  const [celebratingBadge, setCelebratingBadge] = useState<Badge | null>(null)
  const [badgeFilterTier, setBadgeFilterTier] = useState<'all' | 'bronze' | 'silver' | 'gold' | 'platinum'>('all')
  const [badgeFilterCategory, setBadgeFilterCategory] = useState<'all' | 'predictions' | 'trivia' | 'chat' | 'consistency'>('all')

  // Close dropdowns on outside click
  useEffect(() => {
    if (!dropdownOpen && !navDropdownOpen && !avatarDropdownOpen) return
    const handleClick = () => {
      setDropdownOpen(false)
      setNavDropdownOpen(false)
      setAvatarDropdownOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [dropdownOpen, navDropdownOpen, avatarDropdownOpen])

  // Keyboard navigation for groups carousel
  useEffect(() => {
    if (viewMode !== 'groups') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setActiveGroupIndex((prev) => (prev === 0 ? groupsData.length - 1 : prev - 1))
      } else if (e.key === 'ArrowRight') {
        setActiveGroupIndex((prev) => (prev === groupsData.length - 1 ? 0 : prev + 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewMode])

  // Keyboard navigation for schedule carousel
  useEffect(() => {
    if (viewMode !== 'schedule') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setActiveScheduleDayIndex((prev) => (prev === 0 ? prev : prev - 1))
      } else if (e.key === 'ArrowRight') {
        setActiveScheduleDayIndex((prev) => prev + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewMode])

  // Set schedule day to current tournament day when switching to schedule tab
  useEffect(() => {
    if (viewMode !== 'schedule' || matches.length === 0) return

    const dayMap: Record<string, boolean> = {}
    matches.forEach((m) => {
      const key = dateKeyInTZ(new Date(m.match_date))
      dayMap[key] = true
    })
    const sortedKeys = Object.keys(dayMap).sort()
    const todayKey = todayKeyInTZ()

    let idx = sortedKeys.findIndex(k => k === todayKey)
    if (idx === -1) {
      idx = sortedKeys.findIndex(k => k >= todayKey)
      if (idx === -1) idx = 0
    }
    setActiveScheduleDayIndex(idx)
  }, [viewMode, matches])

  // Set predictions day to current tournament day when switching to predictions tab
  useEffect(() => {
    if (viewMode !== 'predictions' || matches.length === 0) return

    const dayMap: Record<string, boolean> = {}
    matches.forEach((m) => {
      const key = dateKeyInTZ(new Date(m.match_date))
      dayMap[key] = true
    })
    const sortedKeys = Object.keys(dayMap).sort()
    const todayKey = todayKeyInTZ()

    let idx = sortedKeys.findIndex(k => k === todayKey)
    if (idx === -1) {
      idx = sortedKeys.findIndex(k => k >= todayKey)
      if (idx === -1) idx = 0
    }
    setActivePredictionsDayIndex(idx)
  }, [viewMode, matches])

  // Admin Panel states
  const [adminUsers, setAdminUsers] = useState<{ id: string; email: string; created_at: string; last_sign_in_at: string | null }[]>([])
  const [loginStats, setLoginStats] = useState<{ login_day: string; active_users: number }[]>([])
  const [loadingAdminData, setLoadingAdminData] = useState(false)
  const [adminSearch, setAdminSearch] = useState('')
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)
  const [dismissedMatchId, setDismissedMatchId] = useState<number | null>(null)
  const phasesTableRef = useRef<HTMLDivElement>(null)
  const [exportingPng, setExportingPng] = useState(false)

  const handleExportPhasesAsPng = useCallback(async () => {
    if (!phasesTableRef.current || exportingPng) return
    setExportingPng(true)
    try {
      const el = phasesTableRef.current

      // Temporarily override styles for the capture so it looks clean on any background
      const originalBg = el.style.background
      const originalPadding = el.style.padding
      const originalBorderRadius = el.style.borderRadius
      el.style.background = '#0f172a'
      el.style.padding = '24px'
      el.style.borderRadius = '0'

      const blob = await toBlob(el, {
        backgroundColor: '#0f172a',
        pixelRatio: 2, // Retina quality
        cacheBust: true,
      })

      // Restore original styles
      el.style.background = originalBg
      el.style.padding = originalPadding
      el.style.borderRadius = originalBorderRadius

      if (!blob) throw new Error('Error al generar la imagen.')

      const file = new File([blob], 'quiniela-posiciones.png', { type: 'image/png' })

      // Try Web Share API first (great for mobile → WhatsApp)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: '🏆 Quiniela Mundial — Tabla de Posiciones',
          text: '¡Mira la tabla de posiciones de la Quiniela del Mundial! ⚽',
          files: [file],
        })
        toast.success('¡Imagen compartida!')
      } else {
        // Fallback: download the PNG
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'quiniela-posiciones.png'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('¡Imagen descargada!')
      }
    } catch (err: any) {
      // navigator.share can throw if user cancels — that's okay
      if (err?.name !== 'AbortError') {
        console.error('Export PNG error:', err)
        toast.error('Error al exportar la imagen.')
      }
    } finally {
      setExportingPng(false)
    }
  }, [exportingPng])
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
      
      if (upsertErr) {
        console.warn('Upsert failed, trying simple insert:', upsertErr)
        await supabase.from('user_logins').insert({
          user_id: uid,
          email: email,
          login_date: today
        })
      }
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
    if (viewMode === 'admin') {
      fetchAdminData()
    }
  }, [viewMode])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetUser || !newPassword) return
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    
    setResettingPassword(true)
    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_reset_user_password', {
        target_user_id: resetUser.id,
        new_password: newPassword
      })
      if (rpcErr) throw rpcErr
      
      toast.success(data || 'Contraseña restablecida con éxito.')
      setResetUser(null)
      setNewPassword('')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Error al restablecer la contraseña.')
    } finally {
      setResettingPassword(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteUser) return
    setDeletingUser(true)
    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_delete_user', {
        target_user_id: deleteUser.id
      })
      if (rpcErr) throw rpcErr
      
      toast.success(data || 'Usuario eliminado con éxito.')
      setDeleteUser(null)
      await fetchAdminData()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Error al eliminar el usuario.')
    } finally {
      setDeletingUser(false)
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
      complete.push({
        dateStr,
        displayDate,
        count: found ? found.active_users : 0
      })
    }
    return complete
  }

  useEffect(() => {
    setMounted(true)

    let cancelled = false

    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (cancelled) return

        if (sessionError) {
          // Invalid refresh token or other auth error — clear the stale session
          console.warn('Session error, signing out:', sessionError.message)
          if (typeof window !== 'undefined') {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i)
              if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                localStorage.removeItem(key)
              }
            }
          }
          await supabase.auth.signOut().catch(() => {})
          router.push('/login')
          return
        }

        if (!session) {
          router.push('/login')
          return
        }

        const user = session.user
        setUserId(user.id)
        
        if (user.email) {
          setUserEmail(user.email)
          const namePart = user.email.split('@')[0]
          setUsername(namePart.charAt(0).toUpperCase() + namePart.slice(1))
          if (namePart.toLowerCase() === 'admin') {
            setAdminMode(true)
          }
          logUserLogin(user.id, user.email)
        }

        // Load global user profiles list
        await loadUserProfiles()

        // Fetch logged-in user's own avatar settings
        try {
          const { data: ownProfile, error: ownProfileErr } = await supabase
            .from('user_profiles')
            .select('avatar_type')
            .eq('user_id', user.id)
            .maybeSingle()
          
          if (!ownProfileErr && ownProfile) {
            setAvatarStyle(ownProfile.avatar_type as any)
            localStorage.setItem('avatar_style', ownProfile.avatar_type)
          }
        } catch (err) {
          console.warn('Could not load own avatar profile, using default:', err)
        }

        await loadMatchesAndPredictions(user.id)
        await loadUserBadges(user.id)
        if (!cancelled) setLoading(false)
      } catch (err) {
        console.error('Session check failed:', err)
        if (typeof window !== 'undefined') {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key)
            }
          }
        }
        await supabase.auth.signOut().catch(() => {})
        if (!cancelled) router.push('/login')
      }
    }

    // Listen for auth state changes (token refresh, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (cancelled) return
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          if (event === 'SIGNED_OUT') {
            router.push('/login')
          }
        }
      }
    )

    checkSession()

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [router])

  // Background auto-sync for matches
  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const runBackgroundSync = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) return

        const res = await fetch('/api/sync-matches', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          console.warn('[AutoSync] HTTP error:', res.status)
          return
        }

        const data = await res.json()
        // If matches were updated, reload the data to show them in the UI
        if (data.success && data.count > 0 && !cancelled) {
          console.log(`[AutoSync] Sincronizados ${data.count} partidos en segundo plano.`)
          await loadMatchesAndPredictions(userId)
        }
      } catch (err) {
        console.error('[AutoSync] Error during background sync:', err)
      }
    }

    // Run initial sync shortly after mounting
    const initialTimeout = setTimeout(() => {
      runBackgroundSync()
    }, 2000)

    // Run sync every 60 seconds
    const interval = setInterval(() => {
      runBackgroundSync()
    }, 60000)

    return () => {
      cancelled = true
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [userId])

  // Listen for native install prompt and detect platform for PWA
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if dismissed previously
    const isDismissed = localStorage.getItem('pwa-install-dismissed') === 'true'
    if (isDismissed) return

    // Check if already running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone
    if (isStandalone) return

    const ua = window.navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window.navigator as any).MSStream
    const safari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/i.test(ua)

    setIsIOS(ios)
    setIsSafari(safari)

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Manual banner display for iOS Safari users who haven't installed yet
    if (ios && safari) {
      setShowInstallBanner(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallApp = async () => {
    if (isIOS) {
      setShowIOSInstructions(true)
      return
    }

    if (!deferredPrompt) return

    deferredPrompt.prompt()
    try {
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowInstallBanner(false)
      }
    } catch (err) {
      console.error('Error in PWA install choice:', err)
    }
    setDeferredPrompt(null)
  }

  const handleDismissInstallBanner = () => {
    setShowInstallBanner(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  useEffect(() => {
    const loadNews = async () => {
      try {
        const res = await fetch('/api/news')
        if (res.ok) {
          const data = await res.json()
          if (data.news && data.news.length > 0) {
            setNews(data.news)
          }
        }
      } catch (err) {
        console.error('Failed to load news:', err)
      }
    }
    loadNews()
  }, [])

  const loadUserProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username, avatar_type')
      if (error) throw error
      if (data) {
        const profileMap: Record<string, string> = {}
        data.forEach((p) => {
          profileMap[p.username.toLowerCase()] = p.avatar_type
        })
        setUserProfiles(profileMap)
      }
    } catch (err) {
      console.error('Error fetching user profiles:', err)
    }
  }

  const loadMatchesAndPredictions = async (uid: string) => {
    try {
      // Fetch matches from Supabase sorted by date
      const { data: matchesData, error: matchesErr } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: true })

      if (matchesErr) throw matchesErr

      // Fetch predictions for current user
      const { data: predictionsData, error: predictionsErr } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', uid)

      if (predictionsErr) throw predictionsErr

      setMatches(matchesData || [])
      
      const predMap: Record<number, Prediction> = {}
      if (predictionsData) {
        predictionsData.forEach((pred) => {
          predMap[pred.match_id] = pred as Prediction
        })
      }
      setPredictions(predMap)

      // Fetch leaderboard
      const { data: leaderboardData, error: leaderboardErr } = await supabase
        .rpc('get_leaderboard')

      if (leaderboardErr) {
        console.error('Error fetching leaderboard:', leaderboardErr)
      } else {
        setLeaderboard(leaderboardData || [])
      }

      // Fetch phase leaderboard
      const { data: phaseLeaderboardData, error: phaseLeaderboardErr } = await supabase
        .rpc('get_leaderboard_by_phase')

      if (phaseLeaderboardErr) {
        console.error('Error fetching phase leaderboard:', phaseLeaderboardErr)
      } else {
        setPhaseLeaderboard(phaseLeaderboardData || [])
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al cargar los partidos de la base de datos.')
    }
  }

  const loadUserBadges = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', uid)

      if (error) throw error

      if (data) {
        const keys = data.map((b: any) => b.badge_key)
        setUnlockedBadges(keys)

        const unviewed = data
          .filter((b: any) => !b.is_viewed)
          .map((b: any) => BADGES_CATALOG.find(cat => cat.key === b.badge_key))
          .filter(Boolean) as Badge[]
        
        setUnviewedBadgesQueue(unviewed)
      }
    } catch (err) {
      console.error('Error fetching user badges:', err)
    }
  }

  // Realtime subscription for badges
  useEffect(() => {
    if (!userId) return

    const badgeChannel = supabase
      .channel(`user_badges_realtime:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newBadgeKey = payload.new.badge_key
          const badgeObj = BADGES_CATALOG.find(b => b.key === newBadgeKey)
          if (badgeObj) {
            setUnlockedBadges((prev) => {
              if (prev.includes(newBadgeKey)) return prev
              return [...prev, newBadgeKey]
            })
            setUnviewedBadgesQueue((prev) => {
              if (prev.some(b => b.key === newBadgeKey)) return prev
              return [...prev, badgeObj]
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(badgeChannel)
    }
  }, [userId])

  // Realtime subscription for user profiles
  useEffect(() => {
    const profilesChannel = supabase
      .channel('user_profiles_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldProfile = payload.old as { username: string }
            if (oldProfile && oldProfile.username) {
              setUserProfiles((prev) => {
                const next = { ...prev }
                delete next[oldProfile.username.toLowerCase()]
                return next
              })
            }
          } else {
            const newProfile = payload.new as { username: string; avatar_type: string }
            if (newProfile && newProfile.username) {
              setUserProfiles((prev) => ({
                ...prev,
                [newProfile.username.toLowerCase()]: newProfile.avatar_type,
              }))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(profilesChannel)
    }
  }, [])

  useEffect(() => {
    if (unviewedBadgesQueue.length > 0) {
      setCelebratingBadge(unviewedBadgesQueue[0])
    } else {
      setCelebratingBadge(null)
    }
  }, [unviewedBadgesQueue])

  const handleCloseBadgeOverlay = async () => {
    if (unviewedBadgesQueue.length === 0) return

    const currentBadge = unviewedBadgesQueue[0]
    
    if (userId) {
      try {
        await supabase
          .from('user_badges')
          .update({ is_viewed: true })
          .eq('user_id', userId)
          .eq('badge_key', currentBadge.key)
      } catch (err) {
        console.error('Failed to mark badge as viewed:', err)
      }
    }

    setUnviewedBadgesQueue(prev => prev.slice(1))
  }

  const handleSyncMatches = async () => {
    if (!userId) return
    setSyncing(true)
    setError('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        throw new Error('No se pudo encontrar la sesión del usuario.')
      }

      const res = await fetch('/api/sync-matches', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Error al sincronizar partidos.')
      }

      const data = await res.json()
      await loadMatchesAndPredictions(userId)
      toast.success(`¡Sincronización exitosa! Se actualizaron ${data.count} partidos del Mundial.`)
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
      
      // Reload matches and predictions
      await loadMatchesAndPredictions(userId)
      toast.success(data || '¡Emulación completa del Mundial finalizada con éxito!')
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
      
      // Reload matches and predictions
      await loadMatchesAndPredictions(userId)
      toast.success(data || '¡Usuarios dummy y pronósticos creados con éxito!')
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
      // 1. Reset emulation: set all matches back to pending with no scores and delete predictions
      const { error: resetErr } = await supabase.rpc('reset_world_cup_emulation')
      if (resetErr) throw resetErr

      // 2. Call the database RPC to delete dummy users and Demo-% matches
      const { data, error: rpcError } = await supabase.rpc('delete_dummies_and_tests')
      if (rpcError) throw rpcError
      
      // Reload matches and predictions
      await loadMatchesAndPredictions(userId)
      toast.success(data || '¡Emulación reiniciada y dummies eliminados con éxito!')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al eliminar dummies y pruebas.')
    } finally {
      setDeletingDummies(false)
    }
  }

  const handleMatchUpdate = async (updatedMatch: Match) => {
    setMatches((current) =>
      current.map((m) => (m.id === updatedMatch.id ? updatedMatch : m))
    )
    if (userId) {
      // Reload leaderboard to show recalculated points immediately
      const { data: leaderboardData, error: lError } = await supabase.rpc('get_leaderboard')
      if (!lError && leaderboardData) setLeaderboard(leaderboardData)
      
      // Reload current user's predictions to show the points they earned for this match
      const { data: predictionsData } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', userId)
      if (predictionsData) {
        const predMap: Record<number, Prediction> = {}
        predictionsData.forEach((p) => {
          predMap[p.match_id] = p
        })
        setPredictions(predMap)
      }
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Seeding helper to make testing easy if matches is empty
  const seedDemoMatches = async () => {
    if (!userId) return
    setSeeding(true)
    setError('')

    const now = new Date()
    
    // Create dates relative to now
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
    const futureDateFar = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString() // 2 days in future
    const futureDateNear = new Date(now.getTime() + 45 * 60 * 1000).toISOString() // 45 mins in future (locked)
    const futureDateMid = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString() // 4 hours in future

    const demoMatches = [
      {
        home_team: 'Argentina',
        away_team: 'Francia',
        match_date: pastDate,
        home_score: 3,
        away_score: 3,
        status: 'finished',
      },
      {
        home_team: 'Brasil',
        away_team: 'Alemania',
        match_date: pastDate,
        home_score: 2,
        away_score: 1,
        status: 'finished',
      },
      {
        home_team: 'España',
        away_team: 'Italia',
        match_date: futureDateFar,
        home_score: null,
        away_score: null,
        status: 'pending',
      },
      {
        home_team: 'Inglaterra',
        away_team: 'Portugal',
        match_date: futureDateNear,
        home_score: null,
        away_score: null,
        status: 'pending',
      },
      {
        home_team: 'México',
        away_team: 'Uruguay',
        match_date: futureDateMid,
        home_score: null,
        away_score: null,
        status: 'pending',
      },
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

  // Calculate user total score from predictions
  const totalPoints = Object.values(predictions).reduce((sum, pred) => sum + (pred.points || 0), 0)
  
  // Calculate completed predictions count
  const predictedCount = Object.keys(predictions).length

  // Calculate current streak (consecutive matches with points > 0, ordered by match date)
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

  // Filter matches based on selection
  const filteredMatches = matches.filter((match) => {
    if (filter === 'pending') {
      return match.status === 'pending'
    }
    if (filter === 'finished') {
      return match.status === 'finished'
    }
    return true
  })

  // Filter users based on search
  const filteredUsers = adminUsers.filter((u) =>
    u.email.toLowerCase().includes(adminSearch.toLowerCase())
  )

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-slate-100 p-4">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando Quiniela...</p>
      </div>
    )
  }

  // Max phase points for trophy badges
  const maxes = {
    f1: phaseLeaderboard.length ? Math.max(...phaseLeaderboard.map(u => Number(u.fase1) || 0)) : 0,
    f2: phaseLeaderboard.length ? Math.max(...phaseLeaderboard.map(u => Number(u.fase2) || 0)) : 0,
    f3: phaseLeaderboard.length ? Math.max(...phaseLeaderboard.map(u => Number(u.fase3) || 0)) : 0,
    f4: phaseLeaderboard.length ? Math.max(...phaseLeaderboard.map(u => Number(u.fase4) || 0)) : 0,
    f5: phaseLeaderboard.length ? Math.max(...phaseLeaderboard.map(u => Number(u.fase5) || 0)) : 0,
    f6: phaseLeaderboard.length ? Math.max(...phaseLeaderboard.map(u => Number(u.fase6) || 0)) : 0,
  }

  // Upcoming match bubble: shows when a match starts within 1 hour
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
              <button
                onClick={() => setDismissedMatchId(upcomingMatch.id)}
                className="absolute top-2 right-2 text-slate-500 hover:text-white text-xs cursor-pointer"
              >✕</button>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-400">⚡ Próximo partido</span>
              </div>
              <p className="text-sm font-bold text-white">
                {tTeam(upcomingMatch.home_team)} vs {tTeam(upcomingMatch.away_team)}
              </p>
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
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-primary/15">
              <video src="/fifaloading.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
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
                    <button
                      type="button"
                      onClick={() => { handleSyncMatches(); setDropdownOpen(false) }}
                      disabled={syncing}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-slate-800/60 transition disabled:opacity-50 cursor-pointer"
                    >
                      {syncing ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7H16"></path></svg>
                      )}
                      <span className="font-semibold">Sincronizar API</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleWorldCupEmulation(); setDropdownOpen(false) }}
                      disabled={emulatingWorldCup}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-amber-400 hover:bg-slate-800/60 transition disabled:opacity-50 cursor-pointer"
                    >
                      {emulatingWorldCup ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      )}
                      <span className="font-semibold">Emular Mundial</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleSeedDummies(); setDropdownOpen(false) }}
                      disabled={seedingDummies}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-slate-800/60 transition disabled:opacity-50 cursor-pointer"
                    >
                      {seedingDummies ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                      )}
                      <span className="font-semibold">Crear Dummies</span>
                    </button>
                    <div className="border-t border-slate-800"></div>
                    <button
                      type="button"
                      onClick={() => { handleDeleteDummiesAndTests(); setDropdownOpen(false) }}
                      disabled={deletingDummies}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-400 hover:bg-slate-800/60 transition disabled:opacity-50 cursor-pointer"
                    >
                      {deletingDummies ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      )}
                      <span className="font-semibold">Eliminar Pruebas</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* User Profile Avatar */}
            {userId && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setAvatarDropdownOpen(!avatarDropdownOpen) }}
                  className="w-10 h-10 rounded-full border border-slate-800 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-950/20 transition cursor-pointer flex items-center justify-center overflow-hidden bg-slate-900 group"
                  title="Mi Perfil"
                >
                  {avatarStyle === 'gold' ? (
                    <video src="/avatar-animado.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : avatarStyle === 'fifa' ? (
                    <video src="/fifaloading.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-black uppercase text-cyan-400">
                      {username.slice(0, 2)}
                    </span>
                  )}
                </button>

                {avatarDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl shadow-black/60 z-50 overflow-hidden animate-fadeIn p-4">
                    <div className="flex items-center gap-3 pb-3.5 border-b border-slate-800/80">
                      <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-800 flex items-center justify-center bg-slate-950">
                        {avatarStyle === 'gold' ? (
                          <video src="/avatar-animado.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
                        ) : avatarStyle === 'fifa' ? (
                          <video src="/fifaloading.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-black text-cyan-400 uppercase">{username.slice(0, 2)}</span>
                        )}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-sm font-black text-white">{username}</span>
                        <span className="text-[10px] text-slate-500 font-bold truncate">{userEmail}</span>
                      </div>
                    </div>

                    <div className="py-3.5 space-y-1.5">
                      <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 block mb-1">
                        Estilo de Avatar
                      </span>
                      
                      {[
                        { key: 'initials', label: '🔠 Iniciales', desc: 'Avatar clásico con tus iniciales.' },
                        { key: 'fifa', label: '⚽ FIFA Loop', desc: 'Video en bucle de la Copa FIFA.' },
                        { key: 'gold', label: '🏆 Oro Animado', desc: 'Trofeo de oro interactivo.' }
                      ].map((styleOption) => (
                        <button
                          key={styleOption.key}
                          type="button"
                          onClick={async () => {
                            setAvatarStyle(styleOption.key as any)
                            localStorage.setItem('avatar_style', styleOption.key)
                            
                            if (userId) {
                              try {
                                const { error } = await supabase
                                  .from('user_profiles')
                                  .upsert({
                                    user_id: userId,
                                    avatar_type: styleOption.key
                                  }, { onConflict: 'user_id' })
                                if (error) throw error
                                toast.success(`Estilo de avatar guardado: ${styleOption.label}`)
                              } catch (err) {
                                console.error('Error saving avatar to DB:', err)
                                toast.error('No se pudo guardar el avatar en la base de datos.')
                              }
                            } else {
                              toast.success(`Estilo de avatar cambiado: ${styleOption.label}`)
                            }
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex flex-col gap-0.5 cursor-pointer ${
                            avatarStyle === styleOption.key
                              ? 'bg-cyan-500/10 border-cyan-500/35 text-cyan-400 font-bold'
                              : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:border-slate-800 hover:text-white'
                          }`}
                        >
                          <span className="font-extrabold">{styleOption.label}</span>
                          <span className="text-[9px] text-slate-500 font-medium leading-none">{styleOption.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notification Bell */}
            {userId && <NotificationBell userId={userId} />}

            {/* Logout Button */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition text-sm font-semibold cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </header>

        {/* Live Match scrolling marquee */}
        <div className="mt-4">
          <LiveMatchTicker matches={matches} />
        </div>

        {showInstallBanner && (
          <div className="mt-6 p-4 sm:p-5 rounded-3xl bg-slate-950/70 border border-primary/25 shadow-lg shadow-cyan-950/5 backdrop-blur-[4px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none relative animate-fadeIn">
            {/* Dismiss Button */}
            <button
              onClick={handleDismissInstallBanner}
              className="absolute top-3 right-3 text-slate-500 hover:text-slate-355 transition duration-150 cursor-pointer text-sm font-bold flex items-center justify-center w-6 h-6 rounded-full hover:bg-slate-900/60"
              title="Cerrar"
            >
              ✕
            </button>

            <div className="flex items-start sm:items-center gap-4.5 pr-6">
              {/* Phone Icon */}
              <div className="shrink-0 w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl">
                📱
              </div>
              <div className="flex flex-col">
                <h4 className="text-sm font-black text-slate-100 tracking-tight leading-tight flex items-center gap-2">
                  🏆 ¡Lleva la Quiniela en tu pantalla!
                </h4>
                <p className="text-[11px] text-slate-400 font-medium leading-normal mt-0.5 max-w-xl">
                  Instala la aplicación en tu pantalla de inicio para una experiencia inmersiva, soporte offline, carga ultra-rápida y notificaciones más fluidas.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2 mt-1 sm:mt-0">
              <button
                onClick={handleInstallApp}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-[11px] uppercase tracking-wider transition active:scale-95 duration-150 cursor-pointer shadow-md"
              >
                Instalar App
              </button>
            </div>
          </div>
        )}

        {/* Navigation Dropdown */}
        <div className="relative mt-6 mb-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setNavDropdownOpen(!navDropdownOpen) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white hover:border-slate-700 transition text-sm font-bold cursor-pointer"
          >
            <span>{viewMode === 'predictions' ? '🔮 Mis Pronósticos' : viewMode === 'schedule' ? '📅 Calendario' : viewMode === 'groups' ? '🏆 Grupos del Mundial' : viewMode === 'phases' ? '📊 Tabla por Fases' : viewMode === 'h2h' ? '🥊 Cara a Cara' : viewMode === 'stats' ? '📈 Mis Estadísticas' : viewMode === 'trivia' ? '🧠 Trivia Diaria' : viewMode === 'live_matches' ? '⚡ Partidos en Vivo' : viewMode === 'badges' ? '🏆 Insignias' : viewMode === 'news_info' ? '📰 Noticias e Info' : '🔧 Panel Admin'}</span>
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
                { key: 'trivia' as const, label: '🧠 Trivia Diaria' },
                { key: 'live_matches' as const, label: '⚡ Partidos en Vivo' },
                { key: 'badges' as const, label: '🏆 Colección de Insignias' },
                { key: 'news_info' as const, label: '📰 Noticias e Info' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => { setViewMode(item.key); setNavDropdownOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-800/60 transition cursor-pointer ${
                    viewMode === item.key ? 'text-primary font-extrabold' : 'text-slate-300 font-semibold'
                  }`}
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
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-800/60 transition cursor-pointer ${
                      viewMode === 'admin' ? 'text-primary font-extrabold' : 'text-amber-400 font-semibold'
                    }`}
                  >
                    🔧 Panel Admin
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Main Content Area conditionally rendered by tab selection */}
        {viewMode === 'predictions' && (
          <>
            {/* User Stats Card */}
            <section className="mt-8 glass-card p-6 relative overflow-hidden">
              {/* On Fire sparkles effect */}
              {isOnFire && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="fire-particle" style={{ left: '10%', animationDelay: '0s' }} />
                  <div className="fire-particle" style={{ left: '25%', animationDelay: '0.3s' }} />
                  <div className="fire-particle" style={{ left: '45%', animationDelay: '0.7s' }} />
                  <div className="fire-particle" style={{ left: '65%', animationDelay: '0.2s' }} />
                  <div className="fire-particle" style={{ left: '80%', animationDelay: '0.5s' }} />
                  <div className="fire-particle" style={{ left: '92%', animationDelay: '0.8s' }} />
                  <div className="fire-particle-glow" />
                </div>
              )}
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
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 0h4m-4 0H8m0 0v13m0-13t2 2m-2-2L6 8M6 8V6a2 2 0 012-2h2m0 16a2 2 0 01-2-2v-1m2 3H6"></path>
                      </svg>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Puntos</span>
                      <span className="text-xl font-black text-amber-400">{totalPoints}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 min-w-[120px]">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                      </svg>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pronósticos</span>
                      <span className="text-xl font-black text-slate-200">{predictedCount}/{matches.length}</span>
                    </div>
                  </div>

                  <div className={`bg-slate-950/80 border rounded-2xl p-4 flex items-center gap-3 min-w-[120px] ${isOnFire ? 'border-orange-500/40 shadow-lg shadow-orange-500/10' : 'border-slate-800'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isOnFire ? 'bg-orange-500/20' : 'bg-slate-800'}`}>
                      {isOnFire ? '🔥' : '⚡'}
                    </div>
                    <div>
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
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Reglas del Torneo y Puntuación
                  </span>
                  <span className="text-slate-500 group-open:rotate-180 transition-transform duration-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </span>
                </summary>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-3 border-t border-slate-900/60">
                  <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                    <span className="font-extrabold text-amber-400 block text-sm">🏆 +5 Puntos</span>
                    <span className="text-slate-400 mt-1 block">Resultado Exacto</span>
                    <span className="text-slate-500 text-[10px] block mt-0.5">Ej: Predijiste 2-1, quedó 2-1.</span>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                    <span className="font-extrabold text-emerald-400 block text-sm">⚽ +3 Puntos</span>
                    <span className="text-slate-400 mt-1 block">Ganador Correcto</span>
                    <span className="text-slate-500 text-[10px] block mt-0.5">Ej: Predijiste 2-0, quedó 1-0.</span>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                    <span className="font-extrabold text-teal-400 block text-sm">🤝 +1 Punto</span>
                    <span className="text-slate-400 mt-1 block">Empate Correcto</span>
                    <span className="text-slate-500 text-[10px] block mt-0.5">Ej: Predijiste 1-1, quedó 2-2.</span>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                    <span className="font-extrabold text-slate-500 block text-sm">❌ 0 Puntos</span>
                    <span className="text-slate-400 mt-1 block">Resultado Incorrecto</span>
                    <span className="text-slate-500 text-[10px] block mt-0.5">Ej: Predijiste 1-0, quedó 1-2.</span>
                  </div>
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
              <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2 mb-4">
                🏆 Tabla de Posiciones
              </h3>
              <div className="space-y-2.5">
                {leaderboard.length === 0 ? (
                  <p className="text-xs text-slate-500">Aún no hay participantes en la tabla.</p>
                ) : (
                  leaderboard.slice(0, 10).map((row, index) => {
                    const isMe = row.username.toLowerCase() === username.toLowerCase()
                    
                    // Streak / On Fire simulation for other users to animate leaderboard
                    const rowOnFire = isMe 
                      ? isOnFire 
                      : (index === 1 || index === 4 || (row.total_points > 25 && row.username.charCodeAt(0) % 2 === 0))
                    
                    // Determine avatar elements and borders for the row based on database settings!
                    const rowAvatarType = userProfiles[row.username.toLowerCase()] || 'initials'
                    let avatarEl: React.ReactNode
                    let borderClass = 'border-slate-800'
                    
                    if (rowAvatarType === 'gold') {
                      avatarEl = <video src="/avatar-animado.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
                      borderClass = 'border-amber-500 shadow-sm shadow-amber-500/10'
                    } else if (rowAvatarType === 'fifa') {
                      avatarEl = <video src="/fifaloading.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
                      borderClass = 'border-cyan-500 shadow-sm shadow-cyan-500/10'
                    } else {
                      // Regular initials with deterministic background gradients
                      const charCodeSum = row.username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
                      const gradients = [
                        'from-purple-900/40 to-indigo-950/40 text-purple-300 border-purple-800/40',
                        'from-blue-900/40 to-cyan-950/40 text-blue-300 border-blue-800/40',
                        'from-teal-900/40 to-emerald-950/40 text-teal-300 border-teal-800/40',
                        'from-pink-900/40 to-rose-950/40 text-pink-300 border-pink-800/40'
                      ]
                      const gradientClass = gradients[charCodeSum % gradients.length]
                      avatarEl = (
                        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${gradientClass} text-[10px] font-black uppercase`}>
                          {row.username.slice(0, 2)}
                        </div>
                      )
                      borderClass = 'border-slate-800 bg-slate-950'
                    }

                    if (index === 0) {
                      borderClass += ' ring-2 ring-yellow-500/25'
                    }

                    return (
                      <div
                        key={row.username}
                        className={`relative overflow-hidden flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 ${
                          rowOnFire
                            ? 'glow-fire-border'
                            : isMe
                            ? 'bg-primary/10 border-primary/30 text-primary font-bold shadow-sm shadow-primary/5'
                            : 'bg-slate-950/40 border-slate-900 hover:border-slate-800 text-slate-300'
                        }`}
                      >
                        {/* Fire Ember Sparks */}
                        {rowOnFire && (
                          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl opacity-60">
                            <div className="fire-particle" style={{ left: '15%', bottom: '-10px', animationDelay: '0s', transform: 'scale(0.4)', animationDuration: '1.8s' }} />
                            <div className="fire-particle" style={{ left: '50%', bottom: '-10px', animationDelay: '0.4s', transform: 'scale(0.4)', animationDuration: '2.2s' }} />
                            <div className="fire-particle" style={{ left: '80%', bottom: '-10px', animationDelay: '0.2s', transform: 'scale(0.4)', animationDuration: '1.5s' }} />
                          </div>
                        )}

                        <div className="flex items-center gap-3 z-10">
                          <span className="w-6 text-xs font-black text-slate-500 text-center flex items-center justify-center">
                            {index === 0 ? '👑' : `#${index + 1}`}
                          </span>
                          {row.rank_change !== undefined && row.rank_change !== null && (
                            <span 
                              className={`text-[9px] font-black w-7 h-5 flex items-center justify-center gap-0.5 rounded-md border transition-all ${
                                Number(row.rank_change) > 0 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/5' 
                                  : Number(row.rank_change) < 0 
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-sm shadow-rose-500/5' 
                                  : 'bg-transparent text-slate-600 border-transparent'
                              }`}
                              title={
                                Number(row.rank_change) > 0 
                                  ? `Subió ${row.rank_change} puesto(s) desde ayer` 
                                  : Number(row.rank_change) < 0 
                                  ? `Bajó ${Math.abs(Number(row.rank_change))} puesto(s) desde ayer` 
                                  : 'Sin cambios de puesto desde ayer'
                              }
                            >
                              {Number(row.rank_change) > 0 
                                ? `▲${row.rank_change}` 
                                : Number(row.rank_change) < 0 
                                ? `▼${Math.abs(Number(row.rank_change))}` 
                                : '—'
                              }
                            </span>
                          )}

                          {/* Row Avatar Container */}
                          <div className={`w-8 h-8 rounded-full overflow-hidden border ${borderClass} flex items-center justify-center bg-slate-950 shrink-0 relative`}>
                            {avatarEl}
                          </div>

                          <span className="text-sm font-extrabold truncate flex items-center gap-1.5">
                            <span className="text-base">{getUserRank(Number(row.total_points)).icon}</span>
                            {row.username} {isMe && <span className="text-[10px] bg-primary text-slate-950 px-1.5 py-0.5 rounded font-black ml-1 uppercase">Tú</span>}
                            {rowOnFire && <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-black ml-1 border border-orange-500/30">🔥 On Fire</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 z-10">
                          <span className="text-[10px] text-slate-500 font-bold">
                            {row.predictions_count} pronós.
                          </span>
                          <span className="text-sm font-black font-mono">
                            {row.total_points} pts
                          </span>
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
                  <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    ⚽ Partidos del Campeonato
                  </h3>
                  {username.toLowerCase() === 'admin' && (
                    <button
                      type="button"
                      onClick={() => setAdminMode(!adminMode)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-[10px] uppercase font-black tracking-wider transition-all duration-300 cursor-pointer ${
                        adminMode 
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-lg shadow-amber-500/5 hover:bg-amber-500/30' 
                          : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                      {adminMode ? 'Modo Admin Activo' : 'Entrar Modo Admin'}
                    </button>
                  )}
                </div>
              </div>

              {/* Day-by-day predictions navigation */}
              {(() => {
                const WORLD_CUP_START = new Date('2026-06-11T00:00:00')
                const predDays: { dateKey: string; label: string; dayNum: number; matches: Match[] }[] = []
                const dayMap: Record<string, Match[]> = {}

                filteredMatches.forEach((m) => {
                  const d = new Date(m.match_date)
                  const key = dateKeyInTZ(d)
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
                          className={`rounded-full px-4 py-2 font-bold tracking-wide transition-all cursor-pointer ${
                            filter === type ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
                          }`}
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
                      <input
                        type="range"
                        min={0}
                        max={predDays.length - 1}
                        value={currentIdx}
                        onChange={(e) => setActivePredictionsDayIndex(Number(e.target.value))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-800 accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-primary/30 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20"
                      />
                      <div className="flex justify-between mt-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>Día {predDays[0]?.dayNum > 0 ? predDays[0].dayNum : 1}</span>
                        <span className="text-primary font-black">
                          {activeDay?.dayNum > 0 ? `Día ${activeDay.dayNum}` : ''} • {activeDay?.label} • {activeDay?.matches.length} partido{activeDay?.matches.length !== 1 ? 's' : ''}
                        </span>
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
                          onOpenChat={setActiveChat}
                          onSave={async (savedPrediction) => {
                            setPredictions((current) => ({
                              ...current,
                              [match.id]: savedPrediction,
                            }))
                          }}
                        />
                      ))}
                    </div>

                    {/* Mobile day navigation */}
                    <div className="flex justify-between items-center mt-6 px-2">
                      <button
                        onClick={() => setActivePredictionsDayIndex(prev => (prev === 0 ? predDays.length - 1 : prev - 1))}
                        className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                        Anterior
                      </button>
                      <span className="text-xs text-slate-450 font-semibold uppercase tracking-wider">
                        {currentIdx + 1} / {predDays.length}
                      </span>
                      <button
                        onClick={() => setActivePredictionsDayIndex(prev => (prev === predDays.length - 1 ? 0 : prev + 1))}
                        className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer"
                      >
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

        {viewMode === 'schedule' && (() => {
          // Group matches by date key (YYYY-MM-DD)
          const WORLD_CUP_START = new Date('2026-06-11T00:00:00')
          const scheduleDays: { dateKey: string; label: string; dayNum: number; matches: Match[] }[] = []
          const dayMap: Record<string, Match[]> = {}

          matches.forEach((m) => {
            const d = new Date(m.match_date)
            const key = dateKeyInTZ(d)
            if (!dayMap[key]) dayMap[key] = []
            dayMap[key].push(m)
          })

          Object.keys(dayMap).sort().forEach((key) => {
            const d = new Date(key + 'T12:00:00')
            const diffMs = d.getTime() - WORLD_CUP_START.getTime()
            const dayNum = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
            const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
            scheduleDays.push({ dateKey: key, label: label.charAt(0).toUpperCase() + label.slice(1), dayNum, matches: dayMap[key] })
          })

          // Find today's tournament day index (default to day closest to today or day 1)
          const todayKey = todayKeyInTZ()
          let defaultIdx = scheduleDays.findIndex(d => d.dateKey === todayKey)
          if (defaultIdx === -1) {
            // Find closest future day or fallback to 0
            defaultIdx = scheduleDays.findIndex(d => d.dateKey >= todayKey)
            if (defaultIdx === -1) defaultIdx = 0
          }

          // Use state but initialize once
          const currentDayIdx = activeScheduleDayIndex < scheduleDays.length ? activeScheduleDayIndex : 0
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
                  {/* Day Selector Row */}
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

                  {/* Day Slider */}
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

                  {/* Navigation + Card */}
                  <div className="relative flex items-center justify-between gap-4 max-w-4xl mx-auto">
                    {/* Left Arrow */}
                    <button
                      onClick={() => setActiveScheduleDayIndex(prev => (prev === 0 ? scheduleDays.length - 1 : prev - 1))}
                      className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-350 hover:text-white transition duration-300 shadow-md cursor-pointer shrink-0 hidden md:flex"
                      aria-label="Día anterior"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>

                    {/* Day Card */}
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
                                        onClick={() => setActiveChat({ id: match.id, homeTeam: match.home_team, awayTeam: match.away_team })}
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

                    {/* Right Arrow */}
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

                  {/* Mobile Controls */}
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
        })()}

        {viewMode === 'groups' && (() => {
          const activeGroup = groupsData[activeGroupIndex]
          return (
            /* World Cup 2026 Groups View Layout (Carousel) */
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

                {/* Central Card (Wider) */}
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

                    {/* Standings Table inside Nav Card */}
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
                            let posClass = "text-slate-400"
                            let rowClass = "border-b border-slate-900/40 hover:bg-slate-900/30 transition-colors"
                            
                            if (isTopTwo) {
                              posClass = "text-emerald-400 font-bold bg-emerald-950/40 rounded-full w-6 h-6 flex items-center justify-center mx-auto text-xs border border-emerald-900/30"
                            } else if (isThird) {
                              posClass = "text-blue-400 font-bold bg-blue-950/30 rounded-full w-6 h-6 flex items-center justify-center mx-auto text-xs border border-blue-900/20"
                            } else {
                              posClass = "text-slate-500 w-6 h-6 flex items-center justify-center mx-auto"
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
        })()}

        {viewMode === 'phases' && (
          <section className="mt-8 animate-fadeIn">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  📊 Tabla de Posiciones por Fases
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Visualiza el desglose de puntos obtenidos en cada una de las 6 fases del torneo. ¡El ganador de cada fase recibe un trofeo 🏆!
                </p>
              </div>
              {phaseLeaderboard.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportPhasesAsPng}
                  disabled={exportingPng}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 group"
                >
                  {exportingPng ? (
                    <>
                      <span className="animate-spin h-3.5 w-3.5 border-2 border-emerald-400 border-t-transparent rounded-full"></span>
                      Exportando…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                      </svg>
                      Exportar PNG
                    </>
                  )}
                </button>
              )}
            </div>

            <div ref={phasesTableRef} className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold uppercase text-xs tracking-wider">
                      <th className="py-4 px-4 text-center w-16">Pos</th>
                      <th className="py-4 px-4">Usuario</th>
                      <th className="py-4 px-2 text-center w-28" title="Fase de Grupos (Partidos 1-72)">Fase 1 (Grupos)</th>
                      <th className="py-4 px-2 text-center w-28" title="Dieciseisavos (Partidos 73-88)">Fase 2 (16avos)</th>
                      <th className="py-4 px-2 text-center w-28" title="Octavos (Partidos 89-96)">Fase 3 (Octavos)</th>
                      <th className="py-4 px-2 text-center w-28" title="Cuartos (Partidos 97-100)">Fase 4 (Cuartos)</th>
                      <th className="py-4 px-2 text-center w-28" title="Semifinales (Partidos 101-102)">Fase 5 (Semis)</th>
                      <th className="py-4 px-2 text-center w-28" title="Tercer Puesto y Final (Partidos 103-104)">Fase 6 (Finales)</th>
                      <th className="py-4 px-4 text-center text-primary font-black w-28">Total Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phaseLeaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-500 font-semibold">
                          No hay datos de emulación disponibles todavía. Presiona "Emular Mundial" en el Panel Admin.
                        </td>
                      </tr>
                    ) : (
                      phaseLeaderboard.map((row, idx) => {
                        const isCurrentUser = username.toLowerCase() === (row.username || '').toLowerCase()
                        const pos = idx + 1
                        
                        // Highlight first 3 users with gold/silver/bronze icons
                        let posEl = <span>{pos}</span>
                        if (pos === 1) posEl = <span className="text-xl">🥇</span>
                        else if (pos === 2) posEl = <span className="text-xl">🥈</span>
                        else if (pos === 3) posEl = <span className="text-xl">🥉</span>

                        return (
                          <tr
                            key={row.username || `row-${idx}`}
                            className={`border-b border-slate-900 hover:bg-slate-900/30 transition-colors ${
                              isCurrentUser ? 'bg-primary/5 font-extrabold text-white' : 'text-slate-300'
                            }`}
                          >
                            <td className="py-3.5 px-4 text-center font-bold">{posEl}</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isCurrentUser ? 'bg-primary animate-pulse' : 'bg-slate-700'}`}></span>
                                <span className="truncate max-w-[120px]">{row.username || 'Desconocido'}</span>
                                {isCurrentUser && <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 shrink-0">Tú</span>}
                              </div>
                            </td>
                            {/* Phase 1 */}
                            <td className={`py-3.5 px-2 text-center font-mono ${Number(row.fase1) === maxes.f1 && maxes.f1 > 0 ? 'text-amber-400 font-bold' : ''}`}>
                              {row.fase1} {Number(row.fase1) === maxes.f1 && maxes.f1 > 0 ? '🏆' : ''}
                            </td>
                            {/* Phase 2 */}
                            <td className={`py-3.5 px-2 text-center font-mono ${Number(row.fase2) === maxes.f2 && maxes.f2 > 0 ? 'text-amber-400 font-bold' : ''}`}>
                              {row.fase2} {Number(row.fase2) === maxes.f2 && maxes.f2 > 0 ? '🏆' : ''}
                            </td>
                            {/* Phase 3 */}
                            <td className={`py-3.5 px-2 text-center font-mono ${Number(row.fase3) === maxes.f3 && maxes.f3 > 0 ? 'text-amber-400 font-bold' : ''}`}>
                              {row.fase3} {Number(row.fase3) === maxes.f3 && maxes.f3 > 0 ? '🏆' : ''}
                            </td>
                            {/* Phase 4 */}
                            <td className={`py-3.5 px-2 text-center font-mono ${Number(row.fase4) === maxes.f4 && maxes.f4 > 0 ? 'text-amber-400 font-bold' : ''}`}>
                              {row.fase4} {Number(row.fase4) === maxes.f4 && maxes.f4 > 0 ? '🏆' : ''}
                            </td>
                            {/* Phase 5 */}
                            <td className={`py-3.5 px-2 text-center font-mono ${Number(row.fase5) === maxes.f5 && maxes.f5 > 0 ? 'text-amber-400 font-bold' : ''}`}>
                              {row.fase5} {Number(row.fase5) === maxes.f5 && maxes.f5 > 0 ? '🏆' : ''}
                            </td>
                            {/* Phase 6 */}
                            <td className={`py-3.5 px-2 text-center font-mono ${Number(row.fase6) === maxes.f6 && maxes.f6 > 0 ? 'text-amber-400 font-bold' : ''}`}>
                              {row.fase6} {Number(row.fase6) === maxes.f6 && maxes.f6 > 0 ? '🏆' : ''}
                            </td>
                            {/* Total points */}
                            <td className="py-3.5 px-4 text-center font-black text-primary text-base font-mono bg-slate-900/20">{row.total_points}</td>
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
        )}

        {viewMode === 'h2h' && (() => {
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
        })()}

        {viewMode === 'stats' && (() => {
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

          // Points by phase
          const phaseRanges = [
            { label: 'Fase 1 (Grupos)', min: 1, max: 72 },
            { label: 'Fase 2 (16avos)', min: 73, max: 88 },
            { label: 'Fase 3 (Octavos)', min: 89, max: 96 },
            { label: 'Fase 4 (Cuartos)', min: 97, max: 100 },
            { label: 'Fase 5 (Semis)', min: 101, max: 102 },
            { label: 'Fase 6 (Finales)', min: 103, max: 104 },
          ]
          const phaseStats = phaseRanges.map(phase => {
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

          // Days active (from user_logins we don't have here, approximate from predictions)
          const predDates = new Set(finishedPreds.map(m => dateKeyInTZ(new Date(m.match_date))))
          const daysActive = predDates.size

          // Days since last prediction
          const lastPredMatch = [...finishedPreds].reverse()[0]
          const now = new Date()
          const daysSinceLast = lastPredMatch
            ? Math.floor((now.getTime() - new Date(lastPredMatch.match_date).getTime()) / (1000 * 60 * 60 * 24))
            : 0

          // Performance over time (group by date, show cumulative points)
          const dailyPoints: { date: string; pts: number; cumulative: number }[] = []
          let cumulative = 0
          const dateMap: Record<string, number> = {}
          finishedPreds.forEach(m => {
            const key = dateKeyInTZ(new Date(m.match_date))
            dateMap[key] = (dateMap[key] || 0) + (predictions[m.id]?.points || 0)
          })
          Object.keys(dateMap).sort().forEach(date => {
            cumulative += dateMap[date]
            dailyPoints.push({ date, pts: dateMap[date], cumulative })
          })

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
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
                  <span className={`text-2xl font-black ${currentStreak >= 3 ? 'text-orange-400' : 'text-slate-400'}`}>{currentStreak}</span>
                  <span className="block text-[10px] uppercase font-bold text-slate-500 mt-1">Racha Actual {isOnFire && '🔥'}</span>
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
                            {/* Grid lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                              <g key={i}>
                                <line x1={pad.left} y1={pad.top + h * (1 - p)} x2={600 - pad.right} y2={pad.top + h * (1 - p)} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                                <text x={pad.left - 5} y={pad.top + h * (1 - p) + 4} fill="#7d8ba6" fontSize="9" textAnchor="end" className="font-mono">{Math.round(maxPts * p)}</text>
                              </g>
                            ))}
                            {/* Area */}
                            <path d={areaPath} fill="url(#chartFill)" />
                            {/* Line */}
                            <path d={linePath} fill="none" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            {/* Dots */}
                            {points.map((p, i) => (
                              <circle key={i} cx={p.x} cy={p.y} r="3" fill="#00d4ff" stroke="#0b0f1a" strokeWidth="2" />
                            ))}
                            {/* X labels */}
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
                <form onSubmit={async (e) => {
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
                }} className="space-y-3">
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
        })()}

        {viewMode === 'trivia' && (
          <TriviaView userId={userId} />
        )}

        {viewMode === 'live_matches' && (
          <LiveMatchesView
            userId={userId}
            isAdmin={username.toLowerCase() === 'admin'}
            onOpenChat={setActiveChat}
          />
        )}

        {viewMode === 'badges' && (() => {
          // Calculate stats
          const totalUnlocked = BADGES_CATALOG.filter(b => unlockedBadges.includes(b.key)).length
          const percent = Math.round((totalUnlocked / BADGES_CATALOG.length) * 100)
          
          const bronzeCount = BADGES_CATALOG.filter(b => b.tier === 'bronze' && unlockedBadges.includes(b.key)).length
          const silverCount = BADGES_CATALOG.filter(b => b.tier === 'silver' && unlockedBadges.includes(b.key)).length
          const goldCount = BADGES_CATALOG.filter(b => b.tier === 'gold' && unlockedBadges.includes(b.key)).length
          const platCount = BADGES_CATALOG.filter(b => b.tier === 'platinum' && unlockedBadges.includes(b.key)).length

          // Filter catalog
          const filteredBadges = BADGES_CATALOG.filter(b => {
            const matchesTier = badgeFilterTier === 'all' || b.tier === badgeFilterTier
            const matchesCategory = badgeFilterCategory === 'all' || b.category === badgeFilterCategory
            return matchesTier && matchesCategory
          })

          return (
            <section className="mt-8 animate-fadeIn text-left">
              {/* Header section */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    🏆 Colección de Insignias
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Fomenta la gamificación completando hitos en pronósticos, trivia diaria, chat y consistencia.
                  </p>
                </div>

                {/* Progress Card */}
                <div className="glass-card p-4 border border-slate-800/80 shadow-xl min-w-[240px] flex flex-col gap-2">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-bold text-slate-400">PROGRESO TOTAL</span>
                    <span className="font-black text-white">{totalUnlocked} / 50 ({percent}%)</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-900">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-500" 
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-1 text-[10px] text-center font-bold">
                    <div className="text-amber-500 bg-amber-950/20 py-0.5 rounded">🥉 {bronzeCount}</div>
                    <div className="text-slate-400 bg-slate-850/30 py-0.5 rounded">🥈 {silverCount}</div>
                    <div className="text-yellow-500 bg-yellow-950/20 py-0.5 rounded">🥇 {goldCount}</div>
                    <div className="text-cyan-400 bg-cyan-950/20 py-0.5 rounded">💎 {platCount}</div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                {/* Tiers filter */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'all', label: 'Todos los Rangos' },
                    { key: 'bronze', label: '🥉 Bronce' },
                    { key: 'silver', label: '🥈 Plata' },
                    { key: 'gold', label: '🥇 Oro' },
                    { key: 'platinum', label: '💎 Platino' }
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => setBadgeFilterTier(item.key as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer border transition-all duration-150 ${
                        badgeFilterTier === item.key
                          ? 'bg-primary text-slate-950 border-primary shadow-md shadow-cyan-950/20'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Categories filter */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'all', label: 'Todas las Categorías' },
                    { key: 'predictions', label: '🔮 Pronósticos' },
                    { key: 'trivia', label: '🧠 Trivia' },
                    { key: 'chat', label: '💬 Chat' },
                    { key: 'consistency', label: '📅 Asistencia' }
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => setBadgeFilterCategory(item.key as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer border transition-all duration-150 ${
                        badgeFilterCategory === item.key
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-950/20'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid */}
              {filteredBadges.length === 0 ? (
                <div className="text-center py-16 text-slate-500 italic glass-card border border-slate-900">
                  Ninguna insignia coincide con los filtros seleccionados.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4.5">
                  {filteredBadges.map(badge => {
                    const isUnlocked = unlockedBadges.includes(badge.key)
                    
                    // Style maps
                    const tierStyles = {
                      bronze: {
                        border: 'border-amber-700/30',
                        bg: 'bg-amber-950/10 backdrop-blur-xs',
                        glow: 'shadow-[0_0_10px_rgba(180,83,9,0.08)]',
                        label: 'bg-amber-900/20 text-amber-400 border-amber-800/30',
                        badgeRing: 'bg-amber-950/30 border-amber-900/30 text-amber-500',
                      },
                      silver: {
                        border: 'border-slate-500/25',
                        bg: 'bg-slate-900/20 backdrop-blur-xs',
                        glow: 'shadow-[0_0_10px_rgba(148,163,184,0.05)]',
                        label: 'bg-slate-800/25 text-slate-300 border-slate-700/25',
                        badgeRing: 'bg-slate-800/30 border-slate-700/30 text-slate-300',
                      },
                      gold: {
                        border: 'border-yellow-500/35',
                        bg: 'bg-yellow-950/10 backdrop-blur-xs',
                        glow: 'shadow-[0_0_15px_rgba(234,179,8,0.12)]',
                        label: 'bg-yellow-900/15 text-yellow-400 border-yellow-800/20',
                        badgeRing: 'bg-yellow-950/35 border-yellow-600/30 text-yellow-500',
                      },
                      platinum: {
                        border: 'border-cyan-500/40',
                        bg: 'bg-gradient-to-br from-cyan-950/15 to-purple-950/10 backdrop-blur-xs',
                        glow: 'shadow-[0_0_18px_rgba(6,182,212,0.18)]',
                        label: 'bg-cyan-950/25 text-cyan-400 border-cyan-850/30',
                        badgeRing: 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400',
                      }
                    }

                    const s = tierStyles[badge.tier]

                    if (isUnlocked) {
                      return (
                        <div 
                          key={badge.key}
                          className={`glass-card p-4.5 border flex flex-col items-center justify-between text-center relative transition-all duration-300 hover:scale-[1.03] select-none ${s.border} ${s.bg} ${s.glow}`}
                          title={`${badge.name}: ${badge.description}`}
                        >
                          <span className={`text-[8px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full border mb-3 select-none ${s.label}`}>
                            {badge.tier}
                          </span>
                          
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-3 shadow border ${s.badgeRing}`}>
                            {badge.icon}
                          </div>

                          <div className="min-h-[48px] flex flex-col justify-center">
                            <h4 className="text-xs font-black text-white leading-tight tracking-tight">
                              {badge.name}
                            </h4>
                            <p className="text-[9px] text-slate-400 font-medium leading-normal mt-1 max-w-[130px] mx-auto select-text">
                              {badge.description}
                            </p>
                          </div>
                        </div>
                      )
                    } else {
                      // Locked Badge View
                      return (
                        <div 
                          key={badge.key}
                          className="glass-card p-4.5 border border-slate-900 bg-slate-950/30 flex flex-col items-center justify-between text-center relative opacity-45 hover:opacity-80 transition-all duration-300 select-none group cursor-help"
                        >
                          <span className="text-[8px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full bg-slate-900/60 text-slate-500 border border-slate-850 mb-3 select-none">
                            Bloqueada
                          </span>
                          
                          {/* Locked icon ring */}
                          <div className="w-14 h-14 rounded-2xl bg-slate-900/40 border border-slate-850 flex items-center justify-center text-3xl mb-3 relative">
                            <span className="filter grayscale blur-[1px] select-none">{badge.icon}</span>
                            {/* Lock Overlay */}
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center text-[10px] text-slate-400 shadow">
                              🔒
                            </div>
                          </div>

                          <div className="min-h-[48px] flex flex-col justify-center">
                            <h4 className="text-xs font-bold text-slate-400 group-hover:text-slate-300 leading-tight tracking-tight">
                              {badge.name}
                            </h4>
                            {/* Shows instruction */}
                            <p className="text-[9px] text-slate-500 font-semibold group-hover:text-slate-400 leading-normal mt-1 max-w-[130px] mx-auto">
                              REQUISITO: {badge.description}
                            </p>
                          </div>
                        </div>
                      )
                    }
                  })}
                </div>
              )}
            </section>
          )
        })()}

        {viewMode === 'news_info' && (
          <NewsInfoView />
        )}

        {viewMode === 'admin' && (
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

                  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((p) => {
                    const yVal = chartPadding.top + chartHeight * (1 - p)
                    const labelVal = Math.round(yScaleMax * p)
                    return { yVal, labelVal }
                  })

                  return (
                    <svg
                      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                      width="100%"
                      height="100%"
                      className="overflow-visible"
                    >
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
                          <line
                            x1={chartPadding.left}
                            y1={line.yVal}
                            x2={svgWidth - chartPadding.right}
                            y2={line.yVal}
                            stroke="rgba(255, 255, 255, 0.08)"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                          />
                          <text
                            x={chartPadding.left - 8}
                            y={line.yVal + 4}
                            fill="#7d8ba6"
                            fontSize="10"
                            fontWeight="bold"
                            textAnchor="end"
                            className="font-mono"
                          >
                            {line.labelVal}
                          </text>
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
                            {/* Transparent hover catcher (full height of column) */}
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
                            
                            {/* Actual visible bar */}
                            <rect
                              x={xPos}
                              y={yPos}
                              width={barW}
                              height={Math.max(barHeight, 2)}
                              rx="4"
                              ry="4"
                              fill={isHovered ? "url(#hoverGradient)" : "url(#barGradient)"}
                              filter={isHovered ? "url(#glowFilter)" : ""}
                              className="transition-all duration-200 pointer-events-none"
                            />

                            {/* X Axis Labels */}
                            {idx % 2 === 0 && (
                              <text
                                x={xPos + barW / 2}
                                y={svgHeight - 15}
                                fill="#7d8ba6"
                                fontSize="9"
                                fontWeight="bold"
                                textAnchor="middle"
                                className="select-none"
                              >
                                {dataPoint.displayDate}
                              </text>
                            )}
                          </g>
                        )
                      })}

                      {/* Interactive Tooltips */}
                      {hoveredBar !== null && (
                        <g className="transition-all duration-150 pointer-events-none">
                          {(() => {
                            const item = chartData[hoveredBar]
                            const barHeight = (item.count / yScaleMax) * chartHeight
                            const xPos = chartPadding.left + hoveredBar * colWidth + colWidth / 2
                            const yPos = chartPadding.top + chartHeight - barHeight

                            const tooltipW = 100
                            const tooltipH = 45
                            let tooltipX = xPos - tooltipW / 2
                            const tooltipY = Math.max(yPos - tooltipH - 10, 5)

                            if (tooltipX < chartPadding.left) tooltipX = chartPadding.left
                            if (tooltipX + tooltipW > svgWidth - chartPadding.right) {
                              tooltipX = svgWidth - chartPadding.right - tooltipW
                            }

                            return (
                              <>
                                <rect
                                  x={tooltipX}
                                  y={tooltipY}
                                  width={tooltipW}
                                  height={tooltipH}
                                  rx="8"
                                  fill="rgba(11, 15, 26, 0.95)"
                                  stroke="rgba(0, 212, 255, 0.4)"
                                  strokeWidth="1"
                                />
                                <text
                                  x={tooltipX + tooltipW / 2}
                                  y={tooltipY + 16}
                                  fill="#ffffff"
                                  fontSize="9"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  {item.dateStr}
                                </text>
                                <text
                                  x={tooltipX + tooltipW / 2}
                                  y={tooltipY + 32}
                                  fill="#00d4ff"
                                  fontSize="11"
                                  fontWeight="black"
                                  textAnchor="middle"
                                >
                                  {item.count} {item.count === 1 ? 'usuario' : 'usuarios'}
                                </text>
                              </>
                            )
                          })()}
                        </g>
                      )}
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
                    onClick={async () => {
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
                        toast.success(`¡Correo enviado a ${data.sent_to} usuario${data.sent_to !== 1 ? 's' : ''}!`)
                      } catch (err: any) {
                        toast.error(err.message || 'Error al enviar correos.')
                      } finally {
                        setSendingDailyEmail(false)
                      }
                    }}
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
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          Cargando lista de usuarios...
                        </td>
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
                          <td className="py-3.5 pr-4 font-extrabold text-slate-200">
                            {u.email}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-400">
                            {new Date(u.created_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-400">
                            {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Nunca'}
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
          </section>
        )}

        {/* Reset Password Modal */}
        {resetUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-sm glass-card p-6 border border-slate-800 shadow-2xl relative">
              <h4 className="text-base font-extrabold text-white mb-2">
                🔑 Cambiar Contraseña
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Estás cambiando la contraseña del usuario <span className="text-slate-200 font-extrabold">{resetUser.email}</span>.
              </p>
              
              <form onSubmit={handleResetPassword}>
                <div className="mb-4">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-850 text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition duration-155"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResetUser(null)
                      setNewPassword('')
                    }}
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
              <h4 className="text-base font-extrabold text-white mb-2">
                ⚠️ ¿Eliminar Usuario permanentemente?
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Esta acción eliminará de forma irreversible al usuario <span className="text-slate-200 font-extrabold">{deleteUser.email}</span>. Todas sus predicciones y estadísticas en la quiniela serán eliminadas permanentemente.
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
                  onClick={handleDeleteUser}
                  disabled={deletingUser}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
                >
                  {deletingUser ? 'Eliminando...' : 'Eliminar Cuenta'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Medals & Achievements Banner */}
        {(() => {
          const medals: { icon: string; msg: string }[] = []

          // Streak medals
          if (currentStreak >= 5) medals.push({ icon: '🔥', msg: `¡Racha imparable! ${currentStreak} aciertos seguidos. Estás en modo bestia.` })
          else if (currentStreak >= 3) medals.push({ icon: '🔥', msg: `¡On Fire! Llevas ${currentStreak} aciertos consecutivos. x1.5 activado.` })

          // Best of the day (check if user has most points in leaderboard)
          if (leaderboard.length > 0 && leaderboard[0]?.username?.toLowerCase() === username.toLowerCase()) {
            medals.push({ icon: '👑', msg: '¡Sos El Patrón! Vas primero en la tabla general.' })
          }

          // Same points as someone else
          const samePointsUser = leaderboard.find(u => u.username.toLowerCase() !== username.toLowerCase() && Number(u.total_points) === totalPoints && totalPoints > 0)
          if (samePointsUser) medals.push({ icon: '⚔️', msg: `Empatado en puntos con ${samePointsUser.username}. ¡El próximo partido define!` })

          // Zero points on recent finished matches (last 3 all missed)
          const recentFinished = matches
            .filter(m => m.status === 'finished' && predictions[m.id])
            .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
            .slice(0, 3)
          const allMissed = recentFinished.length === 3 && recentFinished.every(m => (predictions[m.id]?.points || 0) === 0)
          if (allMissed) medals.push({ icon: '🙈', msg: 'No pegaste ni una en los últimos 3... ¡Pase por sus productos Tosty!' })

          // Predicted all matches for today
          const todayKey = todayKeyInTZ()
          const todayMatches = matches.filter(m => dateKeyInTZ(new Date(m.match_date)) === todayKey)
          const todayAllPredicted = todayMatches.length > 0 && todayMatches.every(m => predictions[m.id])
          if (todayAllPredicted && todayMatches.length > 0) medals.push({ icon: '✅', msg: `¡Todos los partidos de hoy pronosticados! ${todayMatches.length} de ${todayMatches.length}.` })

          // Close to next rank
          if (totalPoints >= 15 && totalPoints < 20) medals.push({ icon: '👟', msg: '¡Te faltan pocos puntos para ser Mejenguero! Dale con todo.' })
          if (totalPoints >= 45 && totalPoints < 50) medals.push({ icon: '🦊', msg: '¡Casi sos Zorro Viejo! Un par de aciertos más y subes de rango.' })
          if (totalPoints >= 140 && totalPoints < 150) medals.push({ icon: '👑', msg: '¡A punto de ser El Patrón! La corona está cerca.' })

          // Second place rivalry
          if (leaderboard.length >= 2 && leaderboard[1]?.username?.toLowerCase() === username.toLowerCase()) {
            medals.push({ icon: '🥈', msg: `Vas segundo, a ${Number(leaderboard[0].total_points) - totalPoints} puntos del líder. ¡A cerrar la brecha!` })
          }

          // Perfect score on a match
          const perfectCount = Object.values(predictions).filter(p => p.points === 5 || p.points === 8).length
          if (perfectCount >= 5) medals.push({ icon: '🎯', msg: `¡${perfectCount} resultados exactos! Tenés ojo clínico.` })
          else if (perfectCount >= 1) medals.push({ icon: '🎯', msg: `¡${perfectCount} resultado${perfectCount > 1 ? 's' : ''} exacto${perfectCount > 1 ? 's' : ''}! Seguí así.` })

          // No predictions yet
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

        {/* Floating Message Button (Bottom-Left) */}
        {userId && (
          <button
            onClick={() => {
              if (!activeChat) {
                setActiveChat({ id: 0, homeTeam: 'Lobby', awayTeam: 'General' })
                setChatMinimized(false)
              } else {
                if (chatMinimized) {
                  setChatMinimized(false)
                } else {
                  setActiveChat(null)
                }
              }
            }}
            className="fixed bottom-20 left-6 z-50 w-14 h-14 rounded-full bg-[#5865F2]/25 hover:bg-[#5865F2]/45 text-[#dbdee1] border border-[#5865F2]/40 hover:border-[#5865F2]/60 backdrop-blur-md shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer select-none"
            title="Chat de la Quiniela"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
          </button>
        )}

        {/* Discord-like Chat Sidebar Overlay */}
        {activeChat && userId && (
          <MatchChat
            matchId={activeChat.id}
            userId={userId}
            homeTeam={activeChat.homeTeam}
            awayTeam={activeChat.awayTeam}
            isAdmin={username.toLowerCase() === 'admin'}
            minimized={chatMinimized}
            setMinimized={setChatMinimized}
            onClose={() => setActiveChat(null)}
            onBackToGeneral={() => {
              setActiveChat({ id: 0, homeTeam: 'Lobby', awayTeam: 'General' })
              setChatMinimized(false)
            }}
            currentUsername={username}
            usersList={leaderboard.map((u) => u.username)}
            userProfiles={userProfiles}
          />
        )}

        {/* iOS Safari Installation Instructions Modal */}
        {showIOSInstructions && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md glass-card p-6 sm:p-7 border border-slate-800 shadow-2xl relative rounded-3xl text-left">
              {/* Close Button */}
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition duration-150 cursor-pointer font-bold text-base flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-900/60"
                title="Cerrar"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl">
                  🍏
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-100 tracking-tight">
                    Instalar en tu iPhone o iPad
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Instrucciones para iOS Safari
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-5">
                Apple no permite la instalación automática de aplicaciones desde el navegador. Sigue estos sencillos pasos para guardarla en tu pantalla de inicio:
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex gap-3.5 items-start">
                  <div className="shrink-0 w-7 h-7 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-black text-slate-300">
                    1
                  </div>
                  <div>
                    <p className="text-xs text-slate-200 font-bold leading-snug">
                      Presiona el botón de Compartir <span className="inline-block px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850 text-base">📤</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Ubicado en la barra de navegación inferior de Safari (en iPhone) o en la barra superior (en iPad).
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start">
                  <div className="shrink-0 w-7 h-7 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-black text-slate-300">
                    2
                  </div>
                  <div>
                    <p className="text-xs text-slate-200 font-bold leading-snug">
                      Selecciona &quot;Agregar a pantalla de inicio&quot; <span className="inline-block px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850 text-base">➕</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Desplázate hacia abajo en el menú de opciones que aparece.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start">
                  <div className="shrink-0 w-7 h-7 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-black text-slate-300">
                    3
                  </div>
                  <div>
                    <p className="text-xs text-slate-200 font-bold leading-snug">
                      Toca &quot;Agregar&quot; en la esquina superior derecha
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      ¡Y listo! Ya aparecerá el ícono de la Quiniela junto al resto de tus aplicaciones.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mini visual mockup of safari options */}
              <div className="p-3 bg-slate-950/50 border border-slate-900 rounded-2xl flex flex-col gap-2 mb-6">
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Vista previa de opciones</div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-850/50">
                  <span className="text-xs font-semibold text-slate-300">Agregar a pantalla de inicio</span>
                  <span className="text-slate-400 text-sm">➕</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider transition active:scale-95 duration-150 cursor-pointer text-center shadow-lg shadow-cyan-950/20"
                >
                  Entendido, ¡gracias!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Badge celebration overlay */}
        <BadgeUnlockOverlay
          badge={celebratingBadge}
          onClose={handleCloseBadgeOverlay}
        />

      </div>
    </div>
  )
}

function getUserRank(points: number): { label: string; icon: string } {
  if (points >= 150) return { label: 'El Patrón', icon: '👑' }
  if (points >= 50) return { label: 'Zorro Viejo', icon: '🦊' }
  if (points >= 20) return { label: 'Mejenguero', icon: '👟' }
  return { label: 'Bateador', icon: '⚾' }
}

