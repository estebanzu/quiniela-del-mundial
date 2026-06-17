'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { MatchComment } from '../lib/types'
import { tTeam } from '../lib/translations'
import toast from 'react-hot-toast'

interface MatchChatProps {
  matchId: number
  userId: string
  homeTeam: string
  awayTeam: string
  isAdmin?: boolean
  minimized: boolean
  setMinimized: (min: boolean) => void
  onClose: () => void
  onBackToGeneral?: () => void
}

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-[#5865F2] text-white', // Discord Blurple
    'bg-[#3BA55D] text-white', // Discord Green
    'bg-[#FAA81A] text-white', // Discord Yellow
    'bg-[#ED4245] text-white', // Discord Red
    'bg-[#EB459E] text-white', // Fuchsia
    'bg-[#00AFF4] text-white', // Cyan
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

const EMOJIS = [
  '⚽', '🏆', '🔥', '🎯', '😂', '🙌', '👍', '🎉',
  '🚀', '👏', '🤫', '👑', '🤩', '🤣', '🤝', '❌',
  '🥅', '👟', '🍺', '🇲🇽', '🇺🇸', '🇨🇦', '🇪🇸', '🇦🇷'
]

export function MatchChat({
  matchId,
  userId,
  homeTeam,
  awayTeam,
  isAdmin = false,
  minimized,
  setMinimized,
  onClose,
  onBackToGeneral,
}: MatchChatProps) {
  const [comments, setComments] = useState<MatchComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Emoji and GIF Picker States
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [gifSearchQuery, setGifSearchQuery] = useState('')
  const [gifs, setGifs] = useState<any[]>([])
  const [gifLoading, setGifLoading] = useState(false)

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    chatEndRef.current?.scrollIntoView({ behavior })
  }

  const isLobby = matchId === 0
  const tableName = isLobby ? 'lobby_comments' : 'match_comments'
  const channelNameSuffix = isLobby ? 'lobby' : `match:${matchId}`

  // Format channel name as a lowercase hyphenated string (e.g. #mexico-vs-ee.-uu. or #general)
  const cleanHome = homeTeam.toLowerCase().trim().replace(/[\s\.]+/g, '-')
  const cleanAway = awayTeam.toLowerCase().trim().replace(/[\s\.]+/g, '-')
  const channelName = isLobby ? 'general' : `${cleanHome}-vs-${cleanAway}`

  // Initial comments load
  useEffect(() => {
    setLoading(true)
    const fetchComments = async () => {
      try {
        let query = supabase.from(tableName).select('*')
        if (!isLobby) {
          query = query.eq('match_id', matchId)
        }
        const { data, error } = await query.order('created_at', { ascending: true })

        if (error) throw error

        if (data) {
          setComments(data)
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

    // Subscribe to realtime database changes for this match/lobby
    const channel = supabase
      .channel(`comments:${channelNameSuffix}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tableName,
          ...(isLobby ? {} : { filter: `match_id=eq.${matchId}` }),
        },
        (payload) => {
          const inserted = payload.new as MatchComment
          setComments((prev) => {
            if (prev.some((c) => c.id === inserted.id)) return prev
            return [...prev, inserted]
          })
          // Scroll if container is scrolled near bottom
          setTimeout(() => scrollToBottom('smooth'), 50)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: tableName,
        },
        (payload) => {
          const deletedId = payload.old.id
          setComments((prev) => prev.filter((c) => c.id !== deletedId))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId])

  // Fetch GIPHY gifs with debounce
  useEffect(() => {
    if (!showGifPicker) return

    let active = true
    const delayDebounceFn = setTimeout(async () => {
      setGifLoading(true)
      try {
        const url = gifSearchQuery.trim()
          ? `https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(gifSearchQuery)}&limit=15`
          : `https://api.giphy.com/v1/gifs/trending?api_key=dc6zaTOxFJmzC&limit=15`
        
        const res = await fetch(url)
        const json = await res.json()
        if (active && json.data) {
          setGifs(json.data)
        }
      } catch (err) {
        console.error('Error fetching GIFs:', err)
      } finally {
        if (active) setGifLoading(false)
      }
    }, 400) // 400ms debounce

    return () => {
      active = false
      clearTimeout(delayDebounceFn)
    }
  }, [gifSearchQuery, showGifPicker])

  // Scroll to bottom on initial loaded or when sending a comment
  useEffect(() => {
    if (comments.length > 0 && !minimized) {
      scrollToBottom('smooth')
    }
  }, [comments.length, minimized])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = newComment.trim()
    if (!content || sending) return

    setSending(true)
    setNewComment('')

    try {
      const payload: any = {
        user_id: userId,
        comment: content,
      }
      if (!isLobby) {
        payload.match_id = matchId
      }

      const { error } = await supabase
        .from(tableName)
        .insert(payload)

      if (error) throw error
    } catch (err: any) {
      console.error('Error posting comment:', err)
      toast.error('Error al enviar el comentario: ' + (err.message || err))
      setNewComment(content) // restore text in input
    } finally {
      setSending(false)
    }
  }

  const handleSendGif = async (gifUrl: string) => {
    if (sending) return
    setSending(true)
    setShowGifPicker(false)

    try {
      const payload: any = {
        user_id: userId,
        comment: gifUrl,
      }
      if (!isLobby) {
        payload.match_id = matchId
      }

      const { error } = await supabase
        .from(tableName)
        .insert(payload)

      if (error) throw error
    } catch (err: any) {
      console.error('Error sending GIF:', err)
      toast.error('Error al enviar el GIF: ' + (err.message || err))
    } finally {
      setSending(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', commentId)

      if (error) throw error
      toast.success('Comentario eliminado')
    } catch (err: any) {
      console.error('Error deleting comment:', err)
      toast.error('No se pudo eliminar el comentario.')
    }
  }

  // Helper function to render text or embed media if a URL is found (e.g. GIPHY gif)
  const renderMessageBody = (content: string) => {
    const isUrl = content.startsWith('http://') || content.startsWith('https://')
    const isImage = content.match(/\.(jpeg|jpg|gif|png)$/) != null || content.includes('giphy.com/media/')

    if (isUrl && isImage) {
      return (
        <div className="mt-1.5 rounded-xl overflow-hidden max-w-[220px] border border-[#1e1f22] bg-[#1e1f22]/50 shadow-md select-none">
          <img src={content} alt="GIF" className="w-full h-auto object-contain max-h-[160px]" loading="lazy" />
        </div>
      )
    }

    return <p className="text-xs sm:text-[13px] text-[#dbdee1] break-words leading-relaxed whitespace-pre-wrap">{content}</p>
  }

  // Handle closing on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (minimized) {
    return (
      <div
        onClick={() => setMinimized(false)}
        className="fixed bottom-20 right-6 z-50 w-[260px] h-12 bg-[#2b2d31] border border-[#202225] rounded-xl shadow-2xl flex items-center justify-between px-3 cursor-pointer hover:bg-[#35373c] transition-all duration-300 animate-slide-in-right text-[#dbdee1] select-none"
        title="Expandir chat"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[#80848e] font-black text-lg">#</span>
          <span className="font-extrabold text-xs truncate max-w-[150px]">
            {isLobby ? 'general' : `${tTeam(homeTeam)} - ${tTeam(awayTeam)}`}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMinimized(false)
            }}
            className="text-[#b5bac1] hover:text-[#f2f3f5] p-1 rounded hover:bg-[#3f4147]"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 15l8-8 8 8" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="text-[#b5bac1] hover:text-[#f2f3f5] p-1 rounded hover:bg-[#3f4147]"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed bottom-20 right-6 z-50 w-[340px] sm:w-[380px] h-[480px] bg-[#313338] border border-[#202225] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-in-right text-[#dbdee1] font-sans"
      role="dialog"
      aria-modal="true"
    >
      {/* Discord Header Panel */}
      <div className="h-14 bg-[#2b2d31] px-3.5 flex items-center justify-between shadow-sm select-none border-b border-[#1f2023] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {!isLobby && onBackToGeneral && (
            <button
              onClick={onBackToGeneral}
              className="text-[#b5bac1] hover:text-[#f2f3f5] p-1 rounded bg-[#383a40] hover:bg-[#43464d] mr-1 flex items-center justify-center shrink-0 cursor-pointer"
              title="Volver a #general"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <span className="text-[#80848e] text-xl font-black shrink-0">#</span>
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="font-extrabold text-[#f2f3f5] text-[13px] sm:text-sm truncate">
              {isLobby ? 'general' : `${tTeam(homeTeam)} - ${tTeam(awayTeam)}`}
            </span>
            <span className="text-[9px] text-[#949ba4] font-medium truncate">
              {isLobby ? 'Canal de chat general' : 'Sala de chat del partido'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Minimize Button */}
          <button
            onClick={() => setMinimized(true)}
            className="text-[#b5bac1] hover:text-[#f2f3f5] hover:bg-[#35373c] p-1.5 rounded-lg transition-colors cursor-pointer"
            title="Minimizar chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 13H5" />
            </svg>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="text-[#b5bac1] hover:text-[#f2f3f5] hover:bg-[#35373c] p-1.5 rounded-lg transition-colors cursor-pointer"
            title="Cerrar chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Message Feed Area */}
      <div className="flex-1 overflow-hidden flex flex-col bg-[#313338] relative min-h-0">
        
        {/* GIF Search Overlay picker */}
        {showGifPicker && (
          <div className="absolute bottom-16 left-4 right-4 bg-[#2b2d31] border border-[#202225] rounded-xl p-2.5 shadow-2xl z-30 select-none animate-fadeIn flex flex-col min-h-[220px]">
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <input
                type="text"
                value={gifSearchQuery}
                onChange={(e) => setGifSearchQuery(e.target.value)}
                placeholder="Buscar en GIPHY..."
                className="flex-1 bg-[#1e1f22] text-[#dbdee1] placeholder-[#80848e] text-xs px-2.5 py-1.5 rounded-lg outline-none border border-[#202225] font-sans"
              />
              <button 
                onClick={() => setShowGifPicker(false)} 
                className="text-xs text-[#949ba4] hover:text-[#dbdee1] font-bold shrink-0 px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            {gifLoading ? (
              <div className="flex-1 flex justify-center items-center py-6 text-xs text-[#949ba4] gap-2">
                <svg className="animate-spin h-4 w-4 text-[#5865F2]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Cargando GIFs...</span>
              </div>
            ) : gifs.length === 0 ? (
              <div className="flex-1 flex justify-center items-center text-xs text-[#949ba4] italic py-6">
                No se encontraron resultados.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[140px] pr-1">
                <div className="grid grid-cols-3 gap-1.5">
                  {gifs.map((gif) => (
                    <button
                      key={gif.id}
                      type="button"
                      onClick={() => handleSendGif(gif.images.fixed_height.url)}
                      className="relative h-14 bg-[#1e1f22] rounded overflow-hidden hover:opacity-85 active:scale-95 transition-all cursor-pointer shadow-sm border border-[#3f4147]/20"
                    >
                      <img src={gif.images.fixed_height_small.url} alt={gif.title} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
                <div className="text-[8px] text-[#949ba4] text-right mt-1.5 uppercase font-bold select-none">
                  Powered by GIPHY
                </div>
              </div>
            )}
          </div>
        )}

        {/* Emoji Selector Overlay picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-16 left-4 right-4 bg-[#2b2d31] border border-[#202225] rounded-xl p-2.5 shadow-2xl z-30 select-none animate-fadeIn">
            <div className="flex justify-between items-center mb-2 px-1 text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider">
              <span>Emojis deportivos y comunes</span>
              <button 
                onClick={() => setShowEmojiPicker(false)} 
                className="text-[#949ba4] hover:text-[#dbdee1] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-8 gap-2 text-lg max-h-[140px] overflow-y-auto pr-1">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setNewComment((prev) => prev + emoji)
                    setShowEmojiPicker(false)
                  }}
                  className="hover:bg-[#35373c] p-1 rounded transition active:scale-90 flex items-center justify-center cursor-pointer text-base sm:text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages feed container */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar scroll-smooth"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#1e1f22 transparent',
          }}
        >
          {/* Welcome Announcement */}
          <div className="mb-4 pt-2 border-b border-[#3f4147]/20 pb-4 select-none">
            <div className="w-12 h-12 rounded-full bg-[#3f4147] flex items-center justify-center text-2xl mb-3 font-black text-[#f2f3f5]">
              #
            </div>
            <h4 className="text-base font-bold text-[#f2f3f5]">
              ¡Te damos la bienvenida a #{channelName}!
            </h4>
            <p className="text-[11px] text-[#949ba4] mt-1 leading-normal font-medium">
              {isLobby
                ? 'Este es el comienzo del canal #general para conversar de todo un poco con los demás participantes.'
                : `Este es el comienzo del canal #${channelName} para debatir sobre las predicciones y celebrar los goles.`}
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col justify-center items-center py-12 text-[#949ba4] gap-2.5 select-none">
              <svg className="animate-spin h-5 w-5 text-[#5865F2]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-wider">Cargando debate...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-[#949ba4] text-xs italic select-none">
              🤫 Silencio en el canal... Sé el primero en mandar un mensaje.
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
                  className={`group flex gap-3 items-start px-2 py-1 -mx-2 rounded hover:bg-[#2e3035] transition-colors duration-100 ${
                    isOwn ? 'bg-[#5865f2]/5' : ''
                  }`}
                >
                  {/* User Avatar */}
                  <div
                    className={`w-8.5 h-8.5 shrink-0 rounded-full flex items-center justify-center text-xs font-black select-none ${avatarColor} shadow`}
                  >
                    {initial}
                  </div>

                  {/* Content Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-[#f2f3f5] hover:underline cursor-pointer truncate">
                        {comment.username}
                      </span>
                      {isOwn && (
                        <span className="text-[8px] uppercase tracking-wider text-[#5865F2] bg-[#5865F2]/10 px-1 py-0.5 rounded font-black leading-none shrink-0 select-none">
                          Tú
                        </span>
                      )}
                      {comment.username.toLowerCase() === 'admin' && (
                        <span className="text-[8px] uppercase tracking-wider text-[#FAA81A] bg-[#FAA81A]/10 px-1 py-0.5 rounded font-black leading-none shrink-0 select-none">
                          MOD
                        </span>
                      )}
                      <span className="text-[9px] text-[#949ba4] font-medium shrink-0 select-none">
                        {timeStr}
                      </span>
                    </div>
                    {renderMessageBody(comment.comment)}
                  </div>

                  {/* Delete Comment */}
                  {(isOwn || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 p-1 rounded text-[#b5bac1] hover:text-[#ed4245] hover:bg-[#ed4245]/10 transition-all cursor-pointer"
                      title="Eliminar mensaje"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  )}
                </div>
              )
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#313338] border-t border-[#3f4147]/15 shrink-0">
          <form onSubmit={handleSubmit} className="flex items-center bg-[#383a40] rounded-lg px-3 py-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={sending}
              placeholder={`Enviar mensaje a #${channelName}`}
              maxLength={500}
              className="flex-1 bg-transparent text-[#dbdee1] placeholder-[#80848e] text-xs sm:text-sm outline-none border-none pr-2 font-sans"
            />
            
            {/* Pickers Toggle Panel Actions */}
            <div className="flex items-center gap-1.5 shrink-0 select-none mr-2">
              {/* Emoji Picker Button */}
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker)
                  setShowGifPicker(false)
                }}
                className={`p-1 text-base sm:text-lg rounded hover:bg-[#4d515a]/50 active:scale-95 transition-all cursor-pointer ${
                  showEmojiPicker ? 'bg-[#43464d]' : ''
                }`}
                title="Añadir Emoji"
              >
                😀
              </button>

              {/* GIF Search Button */}
              <button
                type="button"
                onClick={() => {
                  setShowGifPicker(!showGifPicker)
                  setShowEmojiPicker(false)
                }}
                className={`px-1.5 py-0.5 text-[9px] font-black rounded border cursor-pointer transition-all active:scale-95 ${
                  showGifPicker
                    ? 'text-[#f2f3f5] bg-[#5865F2] border-[#5865F2]'
                    : 'text-[#b5bac1] border-[#b5bac1]/30 hover:border-[#b5bac1]/60'
                }`}
                title="Insertar GIF GIPHY"
              >
                GIF
              </button>
            </div>

            <button
              type="submit"
              disabled={sending || !newComment.trim()}
              className="shrink-0 text-[#b5bac1] hover:text-[#dbdee1] disabled:opacity-30 disabled:hover:text-[#b5bac1] transition-colors duration-150 cursor-pointer"
              aria-label="Enviar mensaje"
            >
              {sending ? (
                <svg className="animate-spin h-4 w-4 text-[#5865F2]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
