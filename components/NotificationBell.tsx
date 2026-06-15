'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

type Notification = {
  id: number
  user_id: string
  type: string
  title: string
  body: string
  match_id: number | null
  is_read: boolean
  created_at: string
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then

  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'hace un momento'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  return `hace ${days} días`
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'match_result': return '⚽'
    case 'streak_started': return '🔥'
    case 'streak_broken': return '💔'
    case 'rank_change': return '📈'
    case 'phase_complete': return '🏆'
    default: return '🔔'
  }
}

function getNotificationAccent(type: string): string {
  switch (type) {
    case 'streak_started': return 'border-l-orange-500'
    case 'streak_broken': return 'border-l-rose-500'
    case 'rank_change': return 'border-l-emerald-500'
    case 'phase_complete': return 'border-l-amber-500'
    default: return 'border-l-primary'
  }
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)

  // Fetch notifications on mount
  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setNotifications(data as Notification[])
      setUnreadCount(data.filter((n: Notification) => !n.is_read).length)
    }
  }, [userId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Subscribe to Realtime inserts on notifications table
  useEffect(() => {
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification

          // Add to the top of the list
          setNotifications((prev) => [newNotif, ...prev].slice(0, 50))
          setUnreadCount((prev) => prev + 1)

          // Show toast if panel is not open
          if (!isOpen) {
            toast(
              (t) => (
                <div
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => {
                    toast.dismiss(t.id)
                    setIsOpen(true)
                  }}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">
                    {getNotificationIcon(newNotif.type)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-white truncate">{newNotif.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{newNotif.body}</p>
                  </div>
                </div>
              ),
              { duration: 5000 }
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, isOpen])

  // Close panel on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    // Delay to avoid immediate close
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick)
    }, 10)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClick)
    }
  }, [isOpen])

  // Mark all as read when panel opens
  useEffect(() => {
    if (!isOpen || unreadCount === 0) return

    const markRead = async () => {
      const { error } = await supabase.rpc('mark_notifications_read')
      if (!error) {
        setUnreadCount(0)
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        )
      }
    }

    // Small delay so user sees the unread state briefly
    const timer = setTimeout(markRead, 800)
    return () => clearTimeout(timer)
  }, [isOpen, unreadCount])

  const handleClearAll = async () => {
    setClearing(true)
    const { error } = await supabase.rpc('clear_all_notifications')
    if (!error) {
      setNotifications([])
      setUnreadCount(0)
      toast.success('Notificaciones eliminadas')
    } else {
      toast.error('Error al limpiar notificaciones')
    }
    setClearing(false)
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={bellRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition cursor-pointer"
        aria-label="Notificaciones"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="notification-panel absolute right-0 mt-2 w-[340px] sm:w-[380px] max-h-[480px] rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 shadow-2xl shadow-black/50 z-50 overflow-hidden flex flex-col"
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h3 className="text-sm font-extrabold text-white tracking-wide flex items-center gap-2">
              🔔 Notificaciones
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-black">
                  {unreadCount}
                </span>
              )}
            </h3>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearing}
                className="text-[11px] font-bold text-slate-500 hover:text-rose-400 transition cursor-pointer disabled:opacity-50"
              >
                {clearing ? 'Limpiando...' : 'Borrar todo'}
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto overscroll-contain" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-500">Sin notificaciones</p>
                <p className="text-[10px] text-slate-600 mt-1">Aparecerán aquí cuando terminen los partidos</p>
              </div>
            ) : (
              <div className="py-1">
                {notifications.map((notif, idx) => (
                  <div
                    key={notif.id}
                    className={`notification-item flex items-start gap-3 px-4 py-3 border-l-2 transition-colors ${
                      getNotificationAccent(notif.type)
                    } ${
                      !notif.is_read
                        ? 'bg-slate-800/40'
                        : 'bg-transparent hover:bg-slate-800/20'
                    }`}
                    style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center text-sm mt-0.5">
                      {getNotificationIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-bold leading-tight ${!notif.is_read ? 'text-white' : 'text-slate-300'}`}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{notif.body}</p>
                      <p className="text-[10px] text-slate-600 mt-1">{timeAgo(notif.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
