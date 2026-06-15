'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

interface TriviaViewProps {
  userId: string | null
}

type TriviaState =
  | { status: 'loading' }
  | { status: 'no_question' }
  | {
      status: 'unanswered'
      question_id: number
      question: string
      options: string[]
      category: string
    }
  | {
      status: 'answered'
      question_id: number
      question: string
      options: string[]
      category: string
      correct_index: number
      selected_index: number
      is_correct: boolean
      points: number
    }

type TriviaStats = {
  total_answered: number
  total_correct: number
  total_points: number
  current_streak: number
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  historia: { label: 'Historia', icon: '📜' },
  '2026': { label: 'Mundial 2026', icon: '🏟️' },
  récords: { label: 'Récords', icon: '🏅' },
  sedes: { label: 'Sedes', icon: '📍' },
  reglas: { label: 'Reglas', icon: '📋' },
  general: { label: 'General', icon: '⚽' },
}

export function TriviaView({ userId }: TriviaViewProps) {
  const [trivia, setTrivia] = useState<TriviaState>({ status: 'loading' })
  const [stats, setStats] = useState<TriviaStats | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [justAnswered, setJustAnswered] = useState(false)

  const loadTrivia = useCallback(async () => {
    if (!userId) return
    try {
      const [{ data: triviaData }, { data: statsData }] = await Promise.all([
        supabase.rpc('get_today_trivia'),
        supabase.rpc('get_trivia_stats'),
      ])

      if (triviaData) {
        if (triviaData.status === 'no_question') {
          setTrivia({ status: 'no_question' })
        } else if (triviaData.status === 'unanswered') {
          setTrivia({
            status: 'unanswered',
            question_id: triviaData.question_id,
            question: triviaData.question,
            options: triviaData.options,
            category: triviaData.category,
          })
        } else if (triviaData.status === 'answered') {
          setTrivia({
            status: 'answered',
            question_id: triviaData.question_id,
            question: triviaData.question,
            options: triviaData.options,
            category: triviaData.category,
            correct_index: triviaData.correct_index,
            selected_index: triviaData.selected_index,
            is_correct: triviaData.is_correct,
            points: triviaData.points,
          })
        }
      } else {
        setTrivia({ status: 'no_question' })
      }

      if (statsData) {
        setStats(statsData as TriviaStats)
      }
    } catch (err) {
      console.error('Error loading trivia:', err)
      setTrivia({ status: 'no_question' })
    }
  }, [userId])

  useEffect(() => {
    loadTrivia()
  }, [loadTrivia])

  const handleSubmit = async (optionIndex: number) => {
    if (trivia.status !== 'unanswered' || submitting) return
    setSelectedOption(optionIndex)
    setSubmitting(true)

    try {
      const { data, error } = await supabase.rpc('submit_trivia_answer', {
        p_question_id: trivia.question_id,
        p_selected_index: optionIndex,
      })

      if (error) throw error

      if (data?.error) {
        toast.error(data.error)
        setSelectedOption(null)
        return
      }

      setJustAnswered(true)

      // Transition to answered state
      setTrivia({
        status: 'answered',
        question_id: trivia.question_id,
        question: trivia.question,
        options: trivia.options,
        category: trivia.category,
        correct_index: data.correct_index,
        selected_index: optionIndex,
        is_correct: data.is_correct,
        points: data.points,
      })

      // Reload stats
      const { data: newStats } = await supabase.rpc('get_trivia_stats')
      if (newStats) setStats(newStats as TriviaStats)

      if (data.is_correct) {
        toast.success(`¡Correcto! +${data.points} pts 🎉`)
      } else {
        toast('¡Respuesta incorrecta! 😔', { icon: '❌' })
      }
    } catch (err: any) {
      console.error('Submit trivia error:', err)
      toast.error('Error al enviar respuesta.')
      setSelectedOption(null)
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (trivia.status === 'loading') {
    return (
      <section className="mt-8 animate-fadeIn">
        <div className="glass-card p-8 flex flex-col items-center justify-center gap-4">
          <div className="animate-spin h-8 w-8 border-3 border-purple-400 border-t-transparent rounded-full"></div>
          <p className="text-slate-400 text-sm font-bold">Cargando trivia del día...</p>
        </div>
      </section>
    )
  }

  // No question today
  if (trivia.status === 'no_question') {
    return (
      <section className="mt-8 animate-fadeIn">
        <div className="mb-6">
          <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            🧠 Trivia Diaria
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Respondé una pregunta del Mundial cada día y ganá puntos extra para el leaderboard.
          </p>
        </div>

        <div className="glass-card p-8 text-center">
          <span className="text-5xl block mb-4">😴</span>
          <h4 className="text-lg font-bold text-white mb-2">No hay trivia para hoy</h4>
          <p className="text-sm text-slate-400">
            ¡Volvé mañana para una nueva pregunta!
          </p>
        </div>

        {stats && <TriviaStatsCard stats={stats} />}
      </section>
    )
  }

  const cat = CATEGORY_LABELS[trivia.category] || CATEGORY_LABELS['general']

  return (
    <section className="mt-8 animate-fadeIn">
      <div className="mb-6">
        <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          🧠 Trivia Diaria
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Respondé una pregunta del Mundial cada día y ganá <span className="text-purple-400 font-bold">+2 pts</span> por respuesta correcta.
        </p>
      </div>

      {/* Question Card */}
      <div className="glass-card overflow-hidden">
        {/* Category & Date Header */}
        <div className="bg-gradient-to-r from-purple-500/20 via-indigo-500/10 to-transparent border-b border-slate-800 px-6 py-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            {cat.icon} {cat.label}
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {new Date().toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>

        {/* Question */}
        <div className="px-6 pt-6 pb-4">
          <h4 className="text-lg font-extrabold text-white leading-snug">
            {trivia.question}
          </h4>
        </div>

        {/* Options */}
        <div className="px-6 pb-6 space-y-3">
          {trivia.options.map((option, idx) => {
            const isAnswered = trivia.status === 'answered'
            const isSelected = isAnswered && trivia.selected_index === idx
            const isCorrect = isAnswered && trivia.correct_index === idx
            const isSubmittingThis = submitting && selectedOption === idx

            let optionClasses = 'w-full text-left p-4 rounded-xl border-2 transition-all duration-300 flex items-center gap-3 '

            if (isAnswered) {
              if (isCorrect) {
                optionClasses += 'border-emerald-500 bg-emerald-500/15 text-emerald-300 '
                if (justAnswered) optionClasses += 'animate-pulse '
              } else if (isSelected) {
                optionClasses += 'border-rose-500 bg-rose-500/15 text-rose-300 '
              } else {
                optionClasses += 'border-slate-800 bg-slate-900/30 text-slate-500 '
              }
            } else {
              optionClasses += 'border-slate-800 bg-slate-900/40 text-slate-200 hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-white cursor-pointer '
              if (isSubmittingThis) {
                optionClasses += 'border-purple-500 bg-purple-500/20 '
              }
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => !isAnswered && !submitting && handleSubmit(idx)}
                disabled={isAnswered || submitting}
                className={optionClasses}
              >
                {/* Letter badge */}
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                  isCorrect ? 'bg-emerald-500/30 text-emerald-300' :
                  isSelected ? 'bg-rose-500/30 text-rose-300' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {isCorrect ? '✓' : isSelected ? '✗' : String.fromCharCode(65 + idx)}
                </span>

                <span className="text-sm font-semibold">{option}</span>

                {isSubmittingThis && (
                  <span className="ml-auto animate-spin h-4 w-4 border-2 border-purple-400 border-t-transparent rounded-full shrink-0"></span>
                )}
              </button>
            )
          })}
        </div>

        {/* Result Banner */}
        {trivia.status === 'answered' && (
          <div className={`px-6 py-4 border-t ${
            trivia.is_correct
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-rose-500/30 bg-rose-500/10'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {trivia.is_correct ? '🎉' : '😔'}
                </span>
                <div>
                  <span className={`text-sm font-extrabold block ${
                    trivia.is_correct ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {trivia.is_correct ? '¡Respuesta correcta!' : '¡Respuesta incorrecta!'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {trivia.is_correct
                      ? `Ganaste ${trivia.points} puntos bonus para el leaderboard.`
                      : `La respuesta correcta era: ${trivia.options[trivia.correct_index]}`
                    }
                  </span>
                </div>
              </div>
              <span className={`text-xl font-black font-mono ${
                trivia.is_correct ? 'text-emerald-400' : 'text-slate-600'
              }`}>
                +{trivia.points}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Stats Card */}
      {stats && <TriviaStatsCard stats={stats} />}
    </section>
  )
}

function TriviaStatsCard({ stats }: { stats: TriviaStats }) {
  const accuracy = stats.total_answered > 0
    ? Math.round((stats.total_correct / stats.total_answered) * 100)
    : 0

  return (
    <div className="mt-6 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
      <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        📊 Tus Estadísticas de Trivia
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Respondidas</span>
          <span className="text-xl font-black text-white mt-1 block font-mono">{stats.total_answered}</span>
        </div>
        <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Correctas</span>
          <span className="text-xl font-black text-emerald-400 mt-1 block font-mono">{stats.total_correct}</span>
        </div>
        <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Precisión</span>
          <span className="text-xl font-black text-purple-400 mt-1 block font-mono">{accuracy}%</span>
        </div>
        <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Racha 🔥</span>
          <span className="text-xl font-black text-amber-400 mt-1 block font-mono">{stats.current_streak}</span>
        </div>
      </div>
      <div className="mt-3 bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/20 rounded-xl p-3 flex items-center gap-3">
        <span className="text-lg">🧠</span>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Puntos Trivia Totales</span>
          <span className="text-base font-black text-purple-400 font-mono">{stats.total_points} pts</span>
        </div>
      </div>
    </div>
  )
}
