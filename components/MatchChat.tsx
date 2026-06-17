'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { MatchComment } from '../lib/types'
import toast from 'react-hot-toast'

interface MatchChatProps {
  matchId: number
  userId: string
  onCommentCountChange?: (count: number | ((prev: number) => number)) => void
}

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'bg-pink-500/20 text-pink-400 border-pink-500/30',
    'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'bg-rose-500/20 text-rose-400 border-rose-500/30',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

export function MatchChat({ matchId, userId, onCommentCountChange }: MatchChatProps) {
  const [comments, setComments] = useState<MatchComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    chatEndRef.current?.scrollIntoView({ behavior })
  }

  // Initial load
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const { data, error } = await supabase
          .from('match_comments')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true })

        if (error) throw error

        if (data) {
          setComments(data)
          if (onCommentCountChange) {
            onCommentCountChange(data.length)
          }
        }
      } catch (err: any) {
        console.error('Error fetching comments:', err)
      } finally {
        setLoading(false)
        // Scroll to bottom once comments are loaded
        setTimeout(() => scrollToBottom('auto'), 50)
      }
    }

    fetchComments()

    // Subscribe to realtime database changes for this match
    const channel = supabase
      .channel(`match:${matchId}:comments`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_comments',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const inserted = payload.new as MatchComment
          setComments((prev) => {
            if (prev.some((c) => c.id === inserted.id)) return prev
            return [...prev, inserted]
          })
          if (onCommentCountChange) {
            onCommentCountChange((count) => count + 1)
          }
          // Scroll if container is scrolled near bottom
          setTimeout(() => scrollToBottom('smooth'), 50)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'match_comments',
        },
        (payload) => {
          const deletedId = payload.old.id
          setComments((prev) => {
            const exists = prev.some((c) => c.id === deletedId)
            if (!exists) return prev
            if (onCommentCountChange) {
              onCommentCountChange((count) => Math.max(0, count - 1))
            }
            return prev.filter((c) => c.id !== deletedId)
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId, onCommentCountChange])

  // Scroll to bottom on initial loaded or when sending a comment
  useEffect(() => {
    if (comments.length > 0) {
      scrollToBottom('smooth')
    }
  }, [comments.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = newComment.trim()
    if (!content || sending) return

    setSending(true)
    setNewComment('')

    try {
      const { error } = await supabase
        .from('match_comments')
        .insert({
          match_id: matchId,
          user_id: userId,
          comment: content,
        })

      if (error) throw error
    } catch (err: any) {
      console.error('Error posting comment:', err)
      toast.error('Error al enviar el comentario: ' + (err.message || err))
      setNewComment(content) // restore text in input
    } finally {
      setSending(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    try {
      const { error } = await supabase
        .from('match_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error
      toast.success('Comentario eliminado')
    } catch (err: any) {
      console.error('Error deleting comment:', err)
      toast.error('No se pudo eliminar el comentario.')
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-900/60 flex flex-col text-slate-200">
      <div className="flex items-center gap-1.5 mb-3 select-none">
        <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
          💬 Muro del Partido
        </span>
        <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800 text-slate-400 font-mono font-bold">
          {comments.length}
        </span>
      </div>

      {/* Chat scroll area */}
      <div
        ref={chatContainerRef}
        className="max-h-[220px] overflow-y-auto mb-3 pr-1 space-y-2.5 custom-scrollbar scroll-smooth"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(51, 65, 85, 0.5) transparent',
        }}
      >
        {loading ? (
          <div className="flex justify-center items-center py-6 text-slate-500 gap-2 select-none">
            <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wider">Cargando comentarios...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs italic select-none">
            💬 ¡No hay comentarios aún! Comienza el debate...
          </div>
        ) : (
          comments.map((comment) => {
            const isOwn = comment.user_id === userId
            const avatarColor = getAvatarColor(comment.username)
            const initial = comment.username.charAt(0).toUpperCase()
            const timeStr = new Date(comment.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })

            return (
              <div
                key={comment.id}
                className={`group flex gap-2.5 items-start p-2 rounded-xl border border-transparent hover:border-slate-800/40 hover:bg-slate-950/20 transition-all duration-200 ${
                  isOwn ? 'bg-primary/5 hover:bg-primary/10 border-primary/5' : ''
                }`}
              >
                {/* User Avatar */}
                <div
                  className={`w-7 h-7 shrink-0 rounded-full border flex items-center justify-center text-[10px] font-black tracking-wider shadow-inner select-none ${avatarColor}`}
                >
                  {initial}
                </div>

                {/* Comment Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2 mb-0.5">
                    <span className="text-[11px] font-black text-slate-300 truncate">
                      {comment.username}
                      {isOwn && <span className="ml-1 text-[8px] uppercase tracking-wider text-cyan-400 bg-cyan-950/30 px-1 py-0.5 rounded border border-cyan-800/20 font-extrabold">Tú</span>}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold font-mono shrink-0 select-none">
                      {timeStr}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-300 break-words leading-relaxed">
                    {comment.comment}
                  </p>
                </div>

                {/* Delete comment action */}
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-all cursor-pointer"
                    title="Eliminar comentario"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                )}
              </div>
            )
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input box */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={sending}
          placeholder="Escribe un comentario..."
          maxLength={500}
          className="flex-1 bg-slate-950 text-slate-100 border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 text-xs px-3 py-2.5 rounded-xl outline-none transition placeholder-slate-650"
        />
        <button
          type="submit"
          disabled={sending || !newComment.trim()}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 hover:text-cyan-400 text-slate-300 disabled:opacity-40 disabled:hover:text-slate-300 disabled:hover:bg-slate-900 disabled:hover:border-slate-800 transition active:scale-95 duration-150 cursor-pointer"
          aria-label="Enviar comentario"
        >
          {sending ? (
            <svg className="animate-spin h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
          )}
        </button>
      </form>
    </div>
  )
}
