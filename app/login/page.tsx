'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const LOCAL_EMAIL_DOMAIN = 'quiniela.local'

// Helper to convert plain username to local email format for Supabase Auth
function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@${LOCAL_EMAIL_DOMAIN}`
}

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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

    try {
      if (tab === 'register') {
        // Sign up with username as email
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
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
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden">
      {/* Background Stadium/Pitch Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(0,212,255,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(15,23,42,0.95),rgba(2,6,23,0.98))] pointer-events-none" />

      {/* Grid overlay for a premium tech-sport feel */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-md glass-card p-8">
        
        {/* Header and App Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-4 animate-pulse">
            <svg className="w-9 h-9 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
            QUINIELA MUNDIAL
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Predice resultados, suma puntos y compite con amigos.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 flex rounded-full bg-slate-950/80 p-1.5 border border-slate-800/60">
          {(['login', 'register'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setTab(mode)
                setError('')
                setMessage('')
              }}
              className={`flex-1 rounded-full py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                tab === mode 
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md font-extrabold transform scale-[1.02]' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        {/* Custom Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Usuario
            </label>
            <div className="relative mt-2">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </span>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder-slate-600 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition duration-200 text-sm"
                placeholder="Ex. messi10"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Contraseña
            </label>
            <div className="relative mt-2">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder-slate-600 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition duration-200 text-sm"
                placeholder="••••••••"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>
          </div>

          {tab === 'register' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Confirmar Contraseña
              </label>
              <div className="relative mt-2">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                  </svg>
                </span>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder-slate-600 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition duration-200 text-sm"
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
            className="w-full mt-4 bg-gradient-to-r from-primary to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black py-3.5 px-4 rounded-2xl transition duration-300 transform active:scale-95 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/10 text-sm uppercase tracking-wider cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </span>
            ) : tab === 'login' ? (
              'Ingresar'
            ) : (
              'Crear Cuenta'
            )}
          </button>
        </form>

        {/* Feedback Messages */}
        {message && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3.5 text-sm text-primary animate-fadeIn">
            <svg className="w-5 h-5 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-rose-950/20 border border-rose-900/40 px-4 py-3.5 text-sm text-rose-300 animate-fadeIn">
            <svg className="w-5 h-5 shrink-0 text-rose-450" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-800/60 text-center">
          <p className="text-xs text-slate-500">
            Esta es una quiniela privada. Tu usuario será registrado bajo el dominio seguro <span className="text-primary font-mono">@{LOCAL_EMAIL_DOMAIN}</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
