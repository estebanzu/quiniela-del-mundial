'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const LOCAL_EMAIL_DOMAIN = 'quiniela.local'

// Helper to convert plain username to local email format for Supabase Auth
function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@${LOCAL_EMAIL_DOMAIN}`
}

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [introStage, setIntroStage] = useState<'visible' | 'fading' | 'finished'>('visible')
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)

  // Countdown to June 11, 2026 at 09:00 AM (local time)
  useEffect(() => {
    const target = new Date('2026-06-11T09:00:00').getTime()

    const update = () => {
      const now = Date.now()
      const diff = target - now
      if (diff <= 0) {
        setCountdown(null)
        return
      }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      })
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Clear localStorage to prevent refresh token not found error on initialization
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key)
        }
      }
    }
    // Sign out cleanly when landing on login page
    supabase.auth.signOut().catch(() => {})

    // Start fading out the intro screen at 3.5s
    const fadeTimer = setTimeout(() => {
      setIntroStage('fading')
    }, 2500)

    // Completely unmount/finish intro screen at 4s
    const finishTimer = setTimeout(() => {
      setIntroStage('finished')
    }, 5000)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(finishTimer)
    }
  }, [])

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    if (!username) {
      setError('Ingresa tu nombre de usuario.')
      setLoading(false)
      return
    }

    try {
      // Look up the user's real email via admin RPC
      const { data, error: rpcErr } = await supabase.rpc('get_user_recovery_email', {
        target_username: username.trim().toLowerCase()
      })

      if (rpcErr) throw rpcErr

      if (!data || data.endsWith('@quiniela.local') || !data.includes('@')) {
        setError('No se encontró un correo de recuperación asociado a ese usuario. Contacta al administrador para restablecer tu contraseña.')
        setLoading(false)
        return
      }

      // Send password reset to the real email
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(data, {
        redirectTo: `${window.location.origin}/login`
      })

      if (resetErr) throw resetErr

      setMessage(`Se envió un enlace de recuperación al correo asociado a "${username}". Revisa tu bandeja de entrada.`)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al intentar recuperar la contraseña. Contacta al administrador.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    const email = usernameToEmail(username)

    if (!username || !password) {
      setError('Por favor, ingresa usuario y contraseña.')
      setLoading(false)
      return
    }

    if (username.length < 3) {
      setError('El usuario debe tener al menos 3 caracteres.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      setLoading(false)
      return
    }

    if (tab === 'register' && password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      setLoading(false)
      return
    }

    if (tab === 'register' && !email) {
      setError('Ingresa tu correo electrónico para poder recuperar tu cuenta.')
      setLoading(false)
      return
    }

    try {
      if (tab === 'register') {
        // Sign up with username as email
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: usernameToEmail(username),
          password,
          options: {
            data: { recovery_email: email.trim().toLowerCase() }
          }
        })

        if (signUpError) throw signUpError

        // If automatic login on signup succeeded and we got a session
        if (signUpData?.session) {
          router.push('/')
          router.refresh()
          return
        }

        // If no session returned, try to sign in automatically immediately (saves user action if verification is disabled but not logged in)
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (!signInError && signInData?.session) {
          router.push('/')
          router.refresh()
          return
        }

        // Fallback message
        setMessage('¡Cuenta creada! Inicia sesión con tus credenciales.')
        setTab('login')
        setPassword('')
        setConfirmPassword('')
      } else {
        // Sign in flow
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError

        if (!signInData?.session) {
          setError('No se pudo establecer la sesión. Verifica tu configuración.')
        } else {
          router.push('/')
          router.refresh()
        }
      }
    } catch (err: any) {
      console.error(err)
      let customError = 'Error de autenticación. Intenta nuevamente.'
      if (err.message === 'User already registered') {
        customError = 'El usuario ya existe. Elige otro nombre.'
      } else if (err.message === 'Invalid login credentials') {
        customError = 'Usuario o contraseña incorrectos.'
      } else {
        customError = err.message || customError
      }
      setError(customError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-950 text-slate-100 overflow-hidden">
      {/* Custom Kicking & Intro Animation Styles */}
      <style jsx global>{`
        @keyframes kick-foot {
          0% { transform: rotate(-35deg) translateX(-10px); }
          30% { transform: rotate(15deg) translateX(5px); } /* Kick! */
          45% { transform: rotate(15deg) translateX(5px); }
          75% { transform: rotate(-35deg) translateX(-10px); }
          100% { transform: rotate(-35deg) translateX(-10px); }
        }

        @keyframes kick-ball {
          0% { transform: translateX(0) translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          30% { transform: translateX(0) translateY(0) rotate(0deg); opacity: 1; } /* Hit! */
          55% { transform: translateX(120px) translateY(-35px) rotate(270deg); opacity: 1; } /* Fly */
          56% { opacity: 0; } /* Hide at boundary */
          80% { transform: translateX(-30px) translateY(0) rotate(0deg); opacity: 0; } /* Reset position hidden */
          85% { opacity: 0.5; } /* Fade back in rolling */
          100% { transform: translateX(0) translateY(0) rotate(-360deg); opacity: 1; } /* Back to origin */
        }

        @keyframes intro-image {
          0% { opacity: 0; transform: scale(1.1); }
          100% { opacity: 0.8; transform: scale(1.0); }
        }

        @keyframes intro-text {
          0% { opacity: 0; transform: translateY(15px); filter: blur(3px); }
          30% { opacity: 0; transform: translateY(15px); filter: blur(3px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        @keyframes intro-progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }

        .animate-kick-foot {
          animation: kick-foot 1.8s infinite ease-in-out;
        }

        .animate-kick-ball {
          animation: kick-ball 1.8s infinite cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .animate-intro-image {
          animation: intro-image 3.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-intro-text {
          animation: intro-text 2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-intro-progress {
          animation: intro-progress 3.5s linear forwards;
        }
      `}</style>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          {/* Kicking Animation Container */}
          <div className="relative w-64 h-32 flex items-center justify-center overflow-hidden bg-slate-900/40 border border-slate-800/80 rounded-3xl shadow-inner">
            {/* Styled Turf/Grass Line */}
            <div className="absolute bottom-5 left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

            {/* Foot/Boot SVG */}
            <div className="absolute bottom-5 left-8 animate-kick-foot origin-top-left z-10">
              <svg className="w-14 h-14 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17,13 C16,13 14,14 12,14.5 C10,15 8,15 6,14.5 C4.5,14.1 3,13.5 2,12.5 C1.5,12 1.2,11.2 1.5,10.5 C1.8,9.8 2.5,9.2 3.5,8.8 C5,8.2 7,8 9,8.5 C11,9 12,10 13,11 C13.5,10.5 14.5,10 16,10 C18.5,10 20.5,11.5 21,13.5 C21.2,14.2 21,15 20.2,15.5 C19.5,16 18.5,16.2 17.5,16 C17.2,15 17,14 17,13 Z" />
                <rect x="5" y="15" width="2" height="1.5" rx="0.5" transform="rotate(-5 5 15)" />
                <rect x="9" y="15.5" width="2" height="1.5" rx="0.5" transform="rotate(-5 9 15.5)" />
                <rect x="13" y="15.5" width="2" height="1.5" rx="0.5" transform="rotate(-5 13 15.5)" />
              </svg>
            </div>

            {/* Soccer Ball SVG */}
            <div className="absolute bottom-6 left-24 animate-kick-ball z-20">
              <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <polygon points="12,9 15,11 14,14 10,14 9,11" />
                <line x1="12" y1="9" x2="12" y2="2" stroke="currentColor" strokeWidth="1.5" />
                <line x1="15" y1="11" x2="21.5" y2="9" stroke="currentColor" strokeWidth="1.5" />
                <line x1="14" y1="14" x2="18" y2="20" stroke="currentColor" strokeWidth="1.5" />
                <line x1="10" y1="14" x2="6" y2="20" stroke="currentColor" strokeWidth="1.5" />
                <line x1="9" y1="11" x2="2.5" y2="9" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-widest text-primary animate-pulse">
            {tab === 'login' ? 'Iniciando Sesión...' : 'Registrando Cuenta...'}
          </p>
        </div>
      )}

      {/* Intro Animation Overlay */}
      {introStage !== 'finished' && (
        <div className={`fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center transition-opacity duration-500 ${introStage === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {/* Ambient Blur to fill letterbox areas */}
          <div 
            className="absolute inset-0 bg-cover bg-center blur-xl opacity-20 animate-intro-image"
            style={{ backgroundImage: "url('/portada.png')" }}
          />
          {/* Main Uncropped Image */}
          <div 
            className="absolute inset-0 bg-contain bg-no-repeat bg-center animate-intro-image"
            style={{ backgroundImage: "url('/portada.png')" }}
          />
          <div className="absolute inset-0 bg-slate-950/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/85" />

          <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-lg">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg shadow-primary/20 mb-4 animate-bounce">
              <video src="/fifaloading.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2 animate-intro-text">
              Copa Mundial FIFA 2026
            </h2>
            <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tight mb-2 animate-intro-text leading-none bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text">
              Quiniela Mundial
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-bold uppercase tracking-wider mb-8 animate-intro-text">
              Familia Calderón Campos
            </p>

            {/* Progress Bar */}
            <div className="w-64 h-1.5 bg-slate-900/80 border border-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full animate-intro-progress" />
            </div>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-3 animate-pulse">
              Cargando Experiencia...
            </p>
          </div>
        </div>
      )}

      {/* Ambient Blur to fill letterbox areas */}
      <div 
        className="absolute inset-0 bg-cover bg-center blur-xl opacity-20 transition-transform duration-[20000ms] scale-80 hover:scale-100"
        style={{ backgroundImage: "url('/portada.png')" }}
      />
      {/* Full Page Cover Image Background (Main) */}
      <div
        className="absolute inset-0 bg-contain bg-no-repeat bg-center transition-transform duration-[20000ms] scale-80 hover:scale-100 opacity-80"
        style={{ backgroundImage: "url('/portada.png')" }}
      />

      {/* Dark overlay to ensure contrast and readability */}
      <div className="absolute inset-0 bg-slate-950/70" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/5 via-transparent to-slate-950/5" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_90%,rgba(11,15,26,0.85)_80%)] pointer-events-none" />

      {/* Grid overlay for a premium tech-sport feel */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Centered Glass Card */}
      <div className="relative w-full max-w-md glass-card p-6 sm:p-8 border border-white/10 shadow-2xl backdrop-blur-xl z-10 transition-all duration-350 hover:border-primary/25">

        {/* Header and App Logo */}
        <div className="mb-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-primary/20 mb-3">
            <video src="/fifaloading.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Copa Mundial FIFA 2026</span>
          <h1 className="text-2xl font-black tracking-tight text-white bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent uppercase mt-1">
            Quiniela Mundial
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            Familia Calderón Campos
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 flex rounded-full bg-slate-950/80 p-1 border border-slate-800/80">
          {(['login', 'register'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setTab(mode)
                setError('')
                setMessage('')
              }}
              className={`flex-1 rounded-full py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${tab === mode || (tab === 'forgot' && mode === 'login')
                ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md font-extrabold transform scale-[1.02]'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              {mode === 'login' ? 'Ingresar' : 'Registrarse'}
            </button>
          ))}
        </div>

        {/* Forgot Password Form */}
        {tab === 'forgot' ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-xs text-slate-400 mb-2">Ingresa tu nombre de usuario y te enviaremos un enlace de recuperación al correo que registraste.</p>
            <div>
              <label htmlFor="forgot-username" className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                Usuario
              </label>
              <div className="relative mt-1.5">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </span>
                <input
                  id="forgot-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950/65 border border-slate-800/60 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-650 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition duration-200 text-sm"
                  placeholder="Ej: messi10"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-primary to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-3.5 px-4 rounded-xl transition duration-300 transform active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/10 text-xs uppercase tracking-wider cursor-pointer"
            >
              {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
            </button>
            <button
              type="button"
              onClick={() => { setTab('login'); setError(''); setMessage('') }}
              className="w-full text-xs text-slate-400 hover:text-white transition mt-2 cursor-pointer"
            >
              ← Volver al inicio de sesión
            </button>
          </form>
        ) : (
        /* Custom Auth Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
              Usuario
            </label>
            <div className="relative mt-1.5">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </span>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950/65 border border-slate-800/60 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-650 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition duration-200 text-sm"
                placeholder="Ej: messi10"
                autoComplete="username"
                required
              />
            </div>
          </div>

          {tab === 'register' && (
            <div>
              <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                Correo Electrónico (para recuperar cuenta)
              </label>
              <div className="relative mt-1.5">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/65 border border-slate-800/60 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-650 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition duration-200 text-sm"
                  placeholder="tucorreo@gmail.com"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
            </label>
            <div className="relative mt-1.5">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/65 border border-slate-800/60 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-650 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition duration-200 text-sm"
                placeholder="••••••••"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>
          </div>

          {tab === 'register' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                Confirmar Contraseña
              </label>
              <div className="relative mt-1.5">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                  </svg>
                </span>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950/65 border border-slate-800/60 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-650 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition duration-200 text-sm"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-primary to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-3.5 px-4 rounded-xl transition duration-300 transform active:scale-[0.98] disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/10 text-xs uppercase tracking-wider cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </span>
            ) : tab === 'login' ? (
              'Iniciar Sesión'
            ) : (
              'Crear Cuenta'
            )}
          </button>

          {tab === 'login' && (
            <button
              type="button"
              onClick={() => { setTab('forgot'); setError(''); setMessage('') }}
              className="w-full text-xs text-slate-400 hover:text-primary transition mt-2 cursor-pointer"
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </form>
        )}

        {/* Feedback Messages */}
        {message && (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-primary/10 border border-primary/20 px-3.5 py-3 text-xs text-primary animate-fadeIn">
            <svg className="w-4 h-4 shrink-0 text-primary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-rose-950/20 border border-rose-900/40 px-3.5 py-3 text-xs text-rose-300 animate-fadeIn">
            <svg className="w-4 h-4 shrink-0 text-rose-450 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          {countdown && (
            <div className="mb-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Primer partido en</p>
              <div className="flex justify-center gap-2">
                {[
                  { value: countdown.days, label: 'Días' },
                  { value: countdown.hours, label: 'Hrs' },
                  { value: countdown.minutes, label: 'Min' },
                  { value: countdown.seconds, label: 'Seg' },
                ].map((unit) => (
                  <div key={unit.label} className="flex flex-col items-center">
                    <span className="text-lg font-black font-mono text-primary bg-slate-950/80 border border-slate-800 rounded-xl w-12 h-12 flex items-center justify-center">
                      {String(unit.value).padStart(2, '0')}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mt-1">{unit.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-[10px] text-slate-500 leading-normal">
            Esta es una quiniela privada solo para la familia. Tu usuario se registrará bajo el dominio seguro <span className="text-primary font-mono font-bold">@{LOCAL_EMAIL_DOMAIN}</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
