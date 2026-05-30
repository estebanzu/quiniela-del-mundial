'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type Match = {
  id: number
  home_team: string
  away_team: string
  match_date: string
  home_score: number | null
  away_score: number | null
  status: 'pending' | 'finished'
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

export default function DashboardPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('Usuario')
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'finished'>('all')
  const [seeding, setSeeding] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [testingPoints, setTestingPoints] = useState(false)
  const [seedingDummies, setSeedingDummies] = useState(false)
  const [deletingDummies, setDeletingDummies] = useState(false)
  const [adminMode, setAdminMode] = useState(false)
  const [leaderboard, setLeaderboard] = useState<{ username: string; total_points: number; predictions_count: number }[]>([])
  const [viewMode, setViewMode] = useState<'predictions' | 'schedule' | 'groups' | 'admin'>('predictions')

  // Admin Panel states
  const [adminUsers, setAdminUsers] = useState<{ id: string; email: string; created_at: string; last_sign_in_at: string | null }[]>([])
  const [loginStats, setLoginStats] = useState<{ login_day: string; active_users: number }[]>([])
  const [loadingAdminData, setLoadingAdminData] = useState(false)
  const [adminSearch, setAdminSearch] = useState('')
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  // Password reset modal states
  const [resetUser, setResetUser] = useState<{ id: string; email: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)

  // Delete user modal states
  const [deleteUser, setDeleteUser] = useState<{ id: string; email: string } | null>(null)
  const [deletingUser, setDeletingUser] = useState(false)

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
      alert('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    
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
      const { data, error: rpcErr } = await supabase.rpc('admin_delete_user', {
        target_user_id: deleteUser.id
      })
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

    const checkSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        setError(sessionError.message)
        setLoading(false)
        return
      }

      if (!session) {
        router.push('/login')
        return
      }

      const user = session.user
      setUserId(user.id)
      
      // Extract username from email (e.g. messi10@quiniela.local -> messi10)
      if (user.email) {
        const namePart = user.email.split('@')[0]
        setUsername(namePart.charAt(0).toUpperCase() + namePart.slice(1))
        if (namePart.toLowerCase() === 'admin') {
          setAdminMode(true)
        }
        // Log user login activity
        logUserLogin(user.id, user.email)
      }

      await loadMatchesAndPredictions(user.id)
      setLoading(false)
    }

    checkSession()

    // Subscribe to auth updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login')
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [router])

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
      alert(`¡Sincronización exitosa! Se actualizaron ${data.count} partidos del Mundial.`)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error durante la sincronización.')
    } finally {
      setSyncing(false)
    }
  }
  const handlePointsSelfTest = async () => {
    if (!userId) return
    setTestingPoints(true)
    setError('')
    try {
      // 1. Delete existing demo matches (will cascade delete predictions due to foreign keys)
      const { error: deleteErr } = await supabase
        .from('matches')
        .delete()
        .like('home_team', 'Demo-%')

      if (deleteErr) throw deleteErr

      // 2. Insert 5 matches as 'pending' (kickoff set to 2 hours from now to bypass lock)
      const testKickoff = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      const demoMatches = [
        { home_team: 'Demo-Argentina', away_team: 'Demo-Francia', match_date: testKickoff, status: 'pending' },
        { home_team: 'Demo-Brasil', away_team: 'Demo-Alemania', match_date: testKickoff, status: 'pending' },
        { home_team: 'Demo-España', away_team: 'Demo-Italia', match_date: testKickoff, status: 'pending' },
        { home_team: 'Demo-Inglaterra', away_team: 'Demo-Portugal', match_date: testKickoff, status: 'pending' },
        { home_team: 'Demo-México', away_team: 'Demo-Uruguay', match_date: testKickoff, status: 'pending' },
      ]

      const { data: matchesData, error: insertMatchesErr } = await supabase
        .from('matches')
        .insert(demoMatches)
        .select()

      if (insertMatchesErr) throw insertMatchesErr
      if (!matchesData || matchesData.length !== 5) {
        throw new Error('No se pudieron crear los partidos de la autoprueba.')
      }

      // Find match IDs
      const mArgFra = matchesData.find(m => m.home_team === 'Demo-Argentina')!
      const mBraGer = matchesData.find(m => m.home_team === 'Demo-Brasil')!
      const mEspIta = matchesData.find(m => m.home_team === 'Demo-España')!
      const mEngPor = matchesData.find(m => m.home_team === 'Demo-Inglaterra')!
      const mMexUru = matchesData.find(m => m.home_team === 'Demo-México')!

      // 3. Insert predictions for the current user
      const demoPredictions = [
        { user_id: userId, match_id: mArgFra.id, predicted_home: 3, predicted_away: 3 }, // Expect 5 (Exact Match 3-3)
        { user_id: userId, match_id: mBraGer.id, predicted_home: 1, predicted_away: 0 }, // Expect 3 (Correct Winner 2-1)
        { user_id: userId, match_id: mEspIta.id, predicted_home: 2, predicted_away: 2 }, // Expect 1 (Correct Draw 1-1)
        { user_id: userId, match_id: mEngPor.id, predicted_home: 0, predicted_away: 1 }, // Expect 0 (Wrong outcome 2-0)
        { user_id: userId, match_id: mMexUru.id, predicted_home: 1, predicted_away: 1 }, // Expect 0 (Wrong outcome 0-2)
      ]

      const { error: insertPredsErr } = await supabase
        .from('predictions')
        .insert(demoPredictions)

      if (insertPredsErr) throw insertPredsErr

      // 4. Update the matches to 'finished' with official scores to trigger PostgreSQL points calculations
      const updates = [
        { id: mArgFra.id, home_score: 3, away_score: 3, status: 'finished' },
        { id: mBraGer.id, home_score: 2, away_score: 1, status: 'finished' },
        { id: mEspIta.id, home_score: 1, away_score: 1, status: 'finished' },
        { id: mEngPor.id, home_score: 2, away_score: 0, status: 'finished' },
        { id: mMexUru.id, home_score: 0, away_score: 2, status: 'finished' },
      ]

      // Update them one by one to make sure each trigger runs
      for (const update of updates) {
        const { error: updateErr } = await supabase
          .from('matches')
          .update({
            home_score: update.home_score,
            away_score: update.away_score,
            status: update.status
          })
          .eq('id', update.id)

        if (updateErr) throw updateErr
      }

      // 5. Reload data
      await loadMatchesAndPredictions(userId)
      alert(
        '¡Autoprueba completada con éxito!\n\n' +
        'Se crearon 5 partidos demo y se registraron tus predicciones.\n' +
        'El trigger de Supabase calculó los puntos automáticamente:\n' +
        '1. Demo-Argentina vs Francia: Predicho 3-3, Quedó 3-3 -> 5 PTS (Exacto)\n' +
        '2. Demo-Brasil vs Alemania: Predicho 1-0, Quedó 2-1 -> 3 PTS (Ganador)\n' +
        '3. Demo-España vs Italia: Predicho 2-2, Quedó 1-1 -> 1 PTS (Empate)\n' +
        '4. Demo-Inglaterra vs Portugal: Predicho 0-1, Quedó 2-0 -> 0 PTS (Fallo)\n' +
        '5. Demo-México vs Uruguay: Predicho 1-1, Quedó 0-2 -> 0 PTS (Fallo)\n\n' +
        'Puntos totales sumados: +9 PTS'
      )
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error durante la autoprueba de puntos.')
    } finally {
      setTestingPoints(false)
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
    if (!confirm('¿Estás seguro de que deseas eliminar los usuarios dummy y todos los partidos y predicciones de prueba?')) return
    setDeletingDummies(true)
    setError('')
    try {
      const { data, error: rpcError } = await supabase.rpc('delete_dummies_and_tests')
      if (rpcError) throw rpcError
      
      // Reload matches and predictions
      await loadMatchesAndPredictions(userId)
      alert(data || '¡Dummies y pruebas eliminados con éxito!')
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

  return (
    <div className="relative min-h-screen bg-transparent text-white pb-12 overflow-x-hidden">
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
              <>
                {/* Sync Button */}
                <button
                  type="button"
                  onClick={handleSyncMatches}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-primary hover:text-cyan-300 hover:border-slate-700 transition text-sm font-semibold cursor-pointer disabled:opacity-50"
                >
                  {syncing ? (
                    <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7H16"></path>
                    </svg>
                  )}
                   <span>Sincronizar API</span>
                </button>

                {/* Points Self-Test Button */}
                <button
                  type="button"
                  onClick={handlePointsSelfTest}
                  disabled={testingPoints}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300 hover:border-slate-700 transition text-sm font-semibold cursor-pointer disabled:opacity-50"
                >
                  {testingPoints ? (
                    <svg className="animate-spin h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z"></path>
                    </svg>
                  )}
                  <span>Autoprueba Puntos</span>
                </button>

                {/* Seed Dummies Button */}
                <button
                  type="button"
                  onClick={handleSeedDummies}
                  disabled={seedingDummies}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-primary hover:text-cyan-300 hover:border-slate-700 transition text-sm font-semibold cursor-pointer disabled:opacity-50"
                >
                  {seedingDummies ? (
                    <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                    </svg>
                  )}
                  <span>Crear Dummies</span>
                </button>

                {/* Delete Dummies & Tests Button */}
                <button
                  type="button"
                  onClick={handleDeleteDummiesAndTests}
                  disabled={deletingDummies}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-rose-450 hover:text-rose-350 hover:border-slate-700 transition text-sm font-semibold cursor-pointer disabled:opacity-50"
                >
                  {deletingDummies ? (
                    <svg className="animate-spin h-4 w-4 text-rose-450" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  )}
                  <span>Eliminar Pruebas</span>
                </button>
              </>
            )}

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

        {/* Tab switcher */}
        <div className="flex gap-4 border-b border-slate-900 mt-6 mb-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setViewMode('predictions')}
            className={`pb-4 px-2 font-bold text-xs uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              viewMode === 'predictions'
                ? 'border-primary text-primary font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🔮 Mis Pronósticos
          </button>
          <button
            type="button"
            onClick={() => setViewMode('schedule')}
            className={`pb-4 px-2 font-bold text-xs uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              viewMode === 'schedule'
                ? 'border-primary text-primary font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📅 Calendario
          </button>
          <button
            type="button"
            onClick={() => setViewMode('groups')}
            className={`pb-4 px-2 font-bold text-xs uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              viewMode === 'groups'
                ? 'border-primary text-primary font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🏆 Grupos del Mundial
          </button>
          {username.toLowerCase() === 'admin' && (
            <button
              type="button"
              onClick={() => setViewMode('admin')}
              className={`pb-4 px-2 font-bold text-xs uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                viewMode === 'admin'
                  ? 'border-primary text-primary font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              🔧 Panel Admin
            </button>
          )}
        </div>

        {/* Main Content Area conditionally rendered by tab selection */}
        {viewMode === 'predictions' && (
          <>
            {/* User Stats Card */}
            <section className="mt-8 glass-card p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <p className="text-xs uppercase font-extrabold tracking-widest text-primary">Bienvenido de vuelta</p>
                  <h2 className="text-3xl font-black tracking-tight text-white mt-1">¡Hola, {username}!</h2>
                  <p className="text-slate-400 text-sm mt-1">Sigue prediciendo para mantenerte arriba.</p>
                </div>

                {/* Score Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 min-w-[140px]">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 0h4m-4 0H8m0 0v13m0-13t2 2m-2-2L6 8M6 8V6a2 2 0 012-2h2m0 16a2 2 0 01-2-2v-1m2 3H6"></path>
                      </svg>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Puntos</span>
                      <span className="text-xl font-black text-amber-400">{totalPoints} pts</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 min-w-[140px]">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                      </svg>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pronósticos</span>
                      <span className="text-xl font-black text-slate-200">{predictedCount} / {matches.length}</span>
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
                    return (
                      <div
                        key={row.username}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-colors ${
                          isMe
                            ? 'bg-primary/10 border-primary/30 text-primary font-bold'
                            : 'bg-slate-950/40 border-slate-900 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 text-xs font-black text-slate-500 text-center">
                            #{index + 1}
                          </span>
                          <span className="text-sm font-extrabold truncate">
                            {row.username} {isMe && <span className="text-[10px] bg-primary text-slate-950 px-1.5 py-0.5 rounded font-black ml-1 uppercase">Tú</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                
                {/* Filter Pill Controls */}
                <div className="flex rounded-full bg-slate-900/80 p-1 border border-slate-800 text-xs">
                  {(['all', 'pending', 'finished'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilter(type)}
                      className={`rounded-full px-4 py-2 font-bold tracking-wide transition-all cursor-pointer ${
                        filter === type
                          ? 'bg-slate-800 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {type === 'all' ? 'Todos' : type === 'pending' ? 'Pendientes' : 'Finalizados'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Match Cards List */}
              <div className="mt-6 space-y-5">
                {filteredMatches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center rounded-[32px] bg-slate-900/20 border border-slate-900">
                    <svg className="w-12 h-12 text-slate-650 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p className="text-slate-400 font-semibold">No se encontraron partidos en esta sección.</p>
                    
                    {/* Seed demo matches if there are absolutely no matches in DB */}
                    {matches.length === 0 && (
                      <button
                        type="button"
                        onClick={seedDemoMatches}
                        disabled={seeding}
                        className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm transition uppercase tracking-wider cursor-pointer shadow-lg shadow-primary/10"
                      >
                        {seeding ? 'Sembrando...' : 'Sembrar Partidos Demo'}
                      </button>
                    )}
                  </div>
                ) : (
                  filteredMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      userId={userId!}
                      match={match}
                      prediction={predictions[match.id]}
                      isAdmin={username.toLowerCase() === 'admin'}
                      adminMode={adminMode}
                      onMatchUpdate={handleMatchUpdate}
                      onSave={async (savedPrediction) => {
                        setPredictions((current) => ({
                          ...current,
                          [match.id]: savedPrediction,
                        }))
                      }}
                    />
                  ))
                )}
              </div>
            </section>
          </>
        )}

        {viewMode === 'schedule' && (
          /* World Cup 2026 Calendario (Schedule) View Layout */
          <section className="mt-8 animate-fadeIn animate-duration-300">
            <div className="mb-6 flex justify-between items-center gap-4">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  📅 Calendario de Partidos
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Consulta las fechas y horarios de todos los partidos del campeonato mundial.
                </p>
              </div>
            </div>

            {matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-[32px] bg-slate-900/20 border border-slate-900">
                <svg className="w-12 h-12 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <p className="text-slate-400 font-semibold">No se encontraron partidos en el calendario.</p>
                <button
                  type="button"
                  onClick={seedDemoMatches}
                  disabled={seeding}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm transition uppercase tracking-wider cursor-pointer shadow-lg shadow-primary/10"
                >
                  {seeding ? 'Sembrando...' : 'Sembrar Partidos Demo'}
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(
                  matches.reduce<Record<string, Match[]>>((groups, match) => {
                    const date = new Date(match.match_date)
                    const dateKey = date.toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })
                    const capitalizedKey = dateKey.charAt(0).toUpperCase() + dateKey.slice(1)
                    if (!groups[capitalizedKey]) {
                      groups[capitalizedKey] = []
                    }
                    groups[capitalizedKey].push(match)
                    return groups
                  }, {})
                ).map(([dateString, dayMatches]) => (
                  <div key={dateString} className="space-y-3">
                    {/* Date Header Accent */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black uppercase tracking-wider text-primary">
                        {dateString}
                      </span>
                      <div className="h-[1px] flex-1 bg-slate-900"></div>
                    </div>

                    {/* Day Matches List */}
                    <div className="grid grid-cols-1 gap-3">
                      {dayMatches.map((match) => {
                        const mDate = new Date(match.match_date)
                        const mTime = mDate.toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        const isFinished = match.status === 'finished'

                        return (
                          <div
                            key={match.id}
                            className="bg-slate-900/30 backdrop-blur-md border border-slate-900 rounded-2xl p-4 flex items-center justify-between gap-4"
                          >
                            {/* Kickoff time */}
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                              <span className="text-sm font-black text-slate-300 font-mono">
                                {mTime}
                              </span>
                            </div>

                            {/* Match Matchup */}
                            <div className="flex-1 flex items-center justify-center gap-2 sm:gap-4 px-2">
                              <span className="text-xs sm:text-sm font-extrabold text-slate-200 text-right flex-1 truncate">
                                {match.home_team}
                              </span>
                              <span className="text-[10px] font-bold text-slate-650 uppercase tracking-widest shrink-0">
                                vs
                              </span>
                              <span className="text-xs sm:text-sm font-extrabold text-slate-200 text-left flex-1 truncate">
                                {match.away_team}
                              </span>
                            </div>

                            {/* Score or Status Badge */}
                            <div className="shrink-0 min-w-[70px] text-right">
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
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {viewMode === 'groups' && (
          /* World Cup 2026 Groups View Layout */
          <section className="mt-8 animate-fadeIn">
            <div className="mb-6">
              <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                🏆 Grupos del Mundial 2026
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Conoce la distribución oficial de las 48 selecciones clasificadas.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {groupsData.map((group) => (
                <div
                  key={group.name}
                  className="collectible-card p-5 group select-none"
                >
                  {/* Header of Nav Card */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/60 mb-4">
                    <span className="font-black text-base tracking-wider text-slate-100 group-hover:text-primary transition-colors">
                      {group.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950 text-slate-500 border border-slate-800 uppercase tracking-widest">
                      Fase 1
                    </span>
                  </div>

                  {/* Team list inside Nav Card */}
                  <ul className="space-y-2.5">
                    {group.teams.map((team, idx) => (
                      <li
                        key={team.name}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-900/60 hover:bg-slate-950/80 transition-colors duration-150"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl select-none" role="img" aria-label={`Bandera de ${team.name}`}>
                            {team.flag}
                          </span>
                          <span className="text-sm font-extrabold text-slate-200">
                            {team.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600">
                          #{idx + 1}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
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

      </div>
    </div>
  )
}

function MatchCard({
  userId,
  match,
  prediction,
  onSave,
  isAdmin = false,
  adminMode = false,
  onMatchUpdate,
}: {
  userId: string
  match: Match
  prediction?: Prediction
  onSave: (prediction: Prediction) => Promise<void>
  isAdmin?: boolean
  adminMode?: boolean
  onMatchUpdate?: (match: Match) => Promise<void>
}) {
  const [homeScore, setHomeScore] = useState(prediction?.predicted_home?.toString() ?? '')
  const [awayScore, setAwayScore] = useState(prediction?.predicted_away?.toString() ?? '')
  
  // Admin inputs state
  const [adminHomeScore, setAdminHomeScore] = useState(match.home_score?.toString() ?? '')
  const [adminAwayScore, setAdminAwayScore] = useState(match.away_score?.toString() ?? '')
  const [adminStatus, setAdminStatus] = useState<Match['status']>(match.status)

  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' | '' }>({ text: '', type: '' })

  // Synchronize state if database prediction changes
  useEffect(() => {
    if (prediction) {
      setHomeScore(prediction.predicted_home.toString())
      setAwayScore(prediction.predicted_away.toString())
    }
  }, [prediction])

  // Synchronize admin states if match data changes
  useEffect(() => {
    setAdminHomeScore(match.home_score?.toString() ?? '')
    setAdminAwayScore(match.away_score?.toString() ?? '')
    setAdminStatus(match.status)
  }, [match])

  const matchDate = new Date(match.match_date)
  const isFinished = match.status === 'finished'
  // locked if less than 1 hour away or finished
  const isLocked = isFinished || (matchDate.getTime() - Date.now() < 3600000)

  const formattedDate = matchDate.toLocaleString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Format date helper to bypass server rendering timezone shifts
  const [displayDate, setDisplayDate] = useState('')
  useEffect(() => {
    setDisplayDate(formattedDate)
  }, [formattedDate])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isLocked) return

    setSaving(true)
    setStatusMsg({ text: '', type: '' })

    const predictedHome = parseInt(homeScore)
    const predictedAway = parseInt(awayScore)

    if (isNaN(predictedHome) || isNaN(predictedAway) || predictedHome < 0 || predictedAway < 0) {
      setStatusMsg({ text: 'Ingresa goles válidos.', type: 'error' })
      setSaving(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('predictions')
        .upsert(
          {
            user_id: userId,
            match_id: match.id,
            predicted_home: predictedHome,
            predicted_away: predictedAway,
          },
          { onConflict: 'user_id,match_id' }
        )
        .select()

      if (error) throw error

      if (data && data[0]) {
        setStatusMsg({ text: '¡Pronóstico guardado!', type: 'success' })
        await onSave(data[0] as Prediction)
        // Clear message after 3 seconds
        setTimeout(() => setStatusMsg({ text: '', type: '' }), 3000)
      }
    } catch (err: any) {
      console.error(err)
      setStatusMsg({ text: err.message || 'Error al guardar.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleAdminSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setStatusMsg({ text: '', type: '' })

    const homeG = adminHomeScore === '' ? null : parseInt(adminHomeScore)
    const awayG = adminAwayScore === '' ? null : parseInt(adminAwayScore)
    
    if (adminStatus === 'finished' && (homeG === null || awayG === null || isNaN(homeG) || isNaN(awayG))) {
      setStatusMsg({ text: 'Los partidos finalizados deben tener goles oficiales.', type: 'error' })
      setSaving(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('matches')
        .update({
          home_score: homeG,
          away_score: awayG,
          status: adminStatus,
        })
        .eq('id', match.id)
        .select()

      if (error) throw error

      if (data && data[0]) {
        setStatusMsg({ text: '¡Resultado oficial guardado!', type: 'success' })
        if (onMatchUpdate) {
          await onMatchUpdate(data[0] as Match)
        }
        setTimeout(() => setStatusMsg({ text: '', type: '' }), 3000)
      }
    } catch (err: any) {
      console.error(err)
      setStatusMsg({ text: err.message || 'Error al guardar resultado.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // Get point badge style and text
  const getPointsBadge = () => {
    if (!isFinished || !prediction) return null
    const pts = prediction.points || 0
    if (pts === 5) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
          🎯 +5 PTS
        </span>
      )
    }
    if (pts === 3) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          ⚽ +3 PTS
        </span>
      )
    }
    if (pts === 1) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-teal-500/20 text-teal-400 border border-teal-500/30">
          🤝 +1 PTS
        </span>
      )
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-500 border border-slate-700">
        ❌ +0 PTS
      </span>
    )
  }

  return (
    <form
      onSubmit={adminMode ? handleAdminSave : handleSave}
      className={`relative overflow-hidden rounded-3xl p-5 shadow-lg border transition-all duration-300 ${
        adminMode 
          ? 'bg-slate-900/40 border-amber-500/30 shadow-amber-950/5'
          : isFinished
          ? 'bg-slate-900/20 border-slate-900'
          : isLocked
          ? 'bg-slate-900/30 border-slate-850'
          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-750/80 shadow-primary/5'
      }`}
    >
      {/* Top Meta info row */}
      <div className="flex justify-between items-center gap-4 mb-4">
        <span className="text-xs font-semibold text-slate-400">
          📅 {displayDate || 'Cargando fecha...'}
        </span>

        {/* Lock / Status Icon Indicator */}
        <div className="flex items-center gap-2">
          {adminMode ? (
            <div className="flex items-center gap-2 select-none">
              <span className="text-[10px] uppercase font-bold text-amber-400">Resultado:</span>
              <select
                value={adminStatus}
                onChange={(e) => setAdminStatus(e.target.value as Match['status'])}
                className="bg-slate-950 text-white border border-slate-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl outline-none focus:border-amber-550 transition duration-150 cursor-pointer"
              >
                <option value="pending">Pendiente ⏳</option>
                <option value="finished">Finalizado ✅</option>
              </select>
            </div>
          ) : (
            <>
              {getPointsBadge()}
              {isFinished ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] uppercase font-black tracking-wider bg-slate-900 border border-slate-800 text-slate-400">
                  Finalizado
                </span>
              ) : isLocked ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-accent/10 text-accent border border-accent/20">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                  Cerrado
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-primary/10 text-primary border border-primary/20">
                  <svg className="w-3 h-3 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                  </svg>
                  Abierto
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Teams Matchup Layout */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
        
        {/* Teams and Score inputs container */}
        <div className="flex-1 w-full flex items-center justify-center gap-2 sm:gap-4 select-none">
          
          {/* Home Team */}
          <div className="flex-1 text-right pr-2">
            <span className="text-sm sm:text-base font-extrabold text-slate-100 truncate block">
              {match.home_team}
            </span>
          </div>

          {/* Goal Inputs block */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={adminMode ? adminHomeScore : homeScore}
              disabled={adminMode ? saving : isLocked || saving}
              onChange={(e) => adminMode ? setAdminHomeScore(e.target.value) : setHomeScore(e.target.value)}
              className={`w-12 h-12 rounded-xl text-center font-black text-lg outline-none transition ${
                adminMode
                  ? 'bg-slate-950 text-amber-400 border border-amber-800/60 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30'
                  : isLocked
                  ? 'bg-slate-950/60 text-slate-500 border border-slate-900 cursor-not-allowed'
                  : 'bg-slate-950 text-white border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/30'
              }`}
              placeholder="-"
              aria-label={`Goles de ${match.home_team}`}
            />
            <span className="text-slate-650 font-bold text-sm">vs</span>
            <input
              type="number"
              min="0"
              value={adminMode ? adminAwayScore : awayScore}
              disabled={adminMode ? saving : isLocked || saving}
              onChange={(e) => adminMode ? setAdminAwayScore(e.target.value) : setAwayScore(e.target.value)}
              className={`w-12 h-12 rounded-xl text-center font-black text-lg outline-none transition ${
                adminMode
                  ? 'bg-slate-950 text-amber-400 border border-amber-800/60 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30'
                  : isLocked
                  ? 'bg-slate-950/60 text-slate-500 border border-slate-900 cursor-not-allowed'
                  : 'bg-slate-950 text-white border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/30'
              }`}
              placeholder="-"
              aria-label={`Goles de ${match.away_team}`}
            />
          </div>

          {/* Away Team */}
          <div className="flex-1 text-left pl-2">
            <span className="text-sm sm:text-base font-extrabold text-slate-100 truncate block">
              {match.away_team}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full sm:w-auto">
          {adminMode ? (
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-28 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3 px-4 rounded-xl transition flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider shadow active:scale-95 duration-150 cursor-pointer"
            >
              {saving ? (
                <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Guardar'
              )}
            </button>
          ) : !isLocked ? (
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-28 bg-gradient-to-r from-slate-900 to-slate-950 hover:from-slate-850 hover:to-slate-900 text-primary hover:text-cyan-400 font-bold py-3 px-4 rounded-xl border border-slate-800 hover:border-slate-700 transition flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider shadow-inner active:scale-95 duration-150 cursor-pointer"
            >
              {saving ? (
                <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : prediction ? (
                'Actualizar'
              ) : (
                'Guardar'
              )}
            </button>
          ) : (
            <div className="w-full sm:w-28 py-3 px-4 rounded-xl bg-slate-950/20 border border-slate-900/60 text-slate-500 font-bold text-xs uppercase tracking-wider text-center select-none">
              🔒 Bloqueado
            </div>
          )}
        </div>
      </div>

      {/* Footer Details: Actual Score Display & Status Message */}
      {(isFinished || prediction || statusMsg.text) && (
        <div className="mt-4 pt-3.5 border-t border-slate-900/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs">
          
          {/* Display actual result vs predicted result */}
          <div className="flex flex-wrap items-center gap-3">
            {isFinished && (
              <span className="font-bold text-slate-400">
                Resultado Oficial:{' '}
                <span className="bg-slate-950 text-primary px-2 py-0.5 rounded font-extrabold font-mono ml-1">
                  {match.home_score} - {match.away_score}
                </span>
              </span>
            )}
            
            {prediction && (
              <span className="text-slate-500 font-semibold">
                Tu predicción:{' '}
                <span className="font-extrabold font-mono text-slate-400">
                  {prediction.predicted_home} - {prediction.predicted_away}
                </span>
              </span>
            )}
          </div>

          {/* Inline alert notifications */}
          {statusMsg.text && (
            <span
              className={`font-bold transition-all duration-300 text-[11px] flex items-center gap-1 ${
                statusMsg.type === 'success' ? 'text-primary' : 'text-rose-400'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              )}
              {statusMsg.text}
            </span>
          )}
        </div>
      )}
    </form>
  )
}
