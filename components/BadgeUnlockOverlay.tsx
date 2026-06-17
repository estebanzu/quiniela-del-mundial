'use client'

import { useEffect, useState } from 'react'
import type { Badge } from '../lib/badges'
import ConfettiCanvas from './ConfettiCanvas'

interface BadgeUnlockOverlayProps {
  badge: Badge | null
  onClose: () => void
}

export default function BadgeUnlockOverlay({ badge, onClose }: BadgeUnlockOverlayProps) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (badge) {
      setActive(true)
      // Play a congratulatory audio chime (synthesized using Web Audio API to avoid external assets)
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        // Short simple retro chime: C5 then E5 then G5
        const playTone = (freq: number, delay: number, duration: number) => {
          const osc = audioCtx.createOscillator()
          const gainNode = audioCtx.createGain()
          
          osc.type = 'triangle'
          osc.frequency.value = freq
          
          gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay)
          gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + delay + 0.05)
          gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + duration)
          
          osc.connect(gainNode)
          gainNode.connect(audioCtx.destination)
          
          osc.start(audioCtx.currentTime + delay)
          osc.stop(audioCtx.currentTime + delay + duration)
        }
        
        playTone(523.25, 0, 0.25)     // C5
        playTone(659.25, 0.12, 0.25)  // E5
        playTone(783.99, 0.24, 0.4)   // G5
      } catch (err) {
        console.warn('Web Audio API chime blocked or unsupported:', err)
      }
    } else {
      setActive(false)
    }
  }, [badge])

  if (!badge) return null

  // Styles based on tier
  const tierStyles = {
    bronze: {
      border: 'border-amber-700/40',
      glow: 'shadow-[0_0_40px_rgba(180,83,9,0.25)]',
      bgGlow: 'from-amber-900/10 to-amber-700/5',
      badgeBorder: 'border-amber-750/30',
      labelColor: 'text-amber-500',
      labelText: 'Insignia de Bronce 🥉',
      btnBg: 'bg-gradient-to-r from-amber-600 to-amber-700 text-slate-100 hover:from-amber-500 hover:to-amber-600'
    },
    silver: {
      border: 'border-slate-500/40',
      glow: 'shadow-[0_0_40px_rgba(148,163,184,0.25)]',
      bgGlow: 'from-slate-700/15 to-slate-500/5',
      badgeBorder: 'border-slate-600/30',
      labelColor: 'text-slate-400',
      labelText: 'Insignia de Plata 🥈',
      btnBg: 'bg-gradient-to-r from-slate-500 to-slate-600 text-white hover:from-slate-400 hover:to-slate-500'
    },
    gold: {
      border: 'border-yellow-500/40',
      glow: 'shadow-[0_0_45px_rgba(234,179,8,0.3)]',
      bgGlow: 'from-yellow-900/15 to-yellow-600/5',
      badgeBorder: 'border-yellow-650/40',
      labelColor: 'text-yellow-500',
      labelText: 'Insignia de Oro 🥇',
      btnBg: 'bg-gradient-to-r from-yellow-500 to-yellow-650 text-slate-950 font-black hover:from-yellow-400 hover:to-yellow-500'
    },
    platinum: {
      border: 'border-cyan-500/50',
      glow: 'shadow-[0_0_50px_rgba(6,182,212,0.4)]',
      bgGlow: 'from-cyan-900/20 to-purple-900/15 animate-pulse duration-[4000ms]',
      badgeBorder: 'border-cyan-500/30',
      labelColor: 'text-cyan-400 font-extrabold tracking-widest',
      labelText: 'Insignia de Platino 💎',
      btnBg: 'bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 text-white font-black hover:opacity-90 animate-gradient-x'
    }
  }

  const s = tierStyles[badge.tier]

  return (
    <>
      {/* Dynamic Canvas Confetti Layer */}
      <ConfettiCanvas active={active} />

      {/* Screen Backdrop */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
        {/* Glow effect under the card */}
        <div className={`absolute w-72 h-72 rounded-full filter blur-3xl opacity-25 ${badge.tier === 'platinum' ? 'bg-cyan-500' : badge.tier === 'gold' ? 'bg-yellow-500' : badge.tier === 'silver' ? 'bg-slate-400' : 'bg-amber-700'}`} />

        {/* Badge Card Wrapper */}
        <div className={`w-full max-w-sm glass-card border p-7 text-center relative ${s.border} ${s.glow} rounded-[32px] overflow-hidden`}>
          {/* Internal ambient color glow */}
          <div className={`absolute inset-0 bg-gradient-to-br -z-10 opacity-70 ${s.bgGlow}`} />

          {/* Sparkles / Light flares */}
          <div className="absolute top-2 left-6 text-white/10 text-xl font-bold animate-ping">✨</div>
          <div className="absolute bottom-8 right-8 text-white/10 text-lg font-bold animate-ping duration-1000">✨</div>

          {/* Subtitle / Header */}
          <div className="mb-4">
            <span className={`text-[10px] uppercase font-black tracking-widest leading-none block px-2.5 py-1 rounded-full bg-slate-950/50 w-fit mx-auto border border-slate-800/60 ${s.labelColor}`}>
              {s.labelText}
            </span>
          </div>

          <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">
            🎉 ¡Logro Desbloqueado! 🎉
          </h5>

          {/* Large Floating Badge Icon Container */}
          <div className="my-6">
            <div className={`w-24 h-24 rounded-[32px] bg-slate-950/60 border ${s.badgeBorder} flex items-center justify-center text-5xl mx-auto shadow-2xl relative animate-float`}>
              {badge.icon}
              {badge.tier === 'platinum' && (
                <div className="absolute -inset-1 rounded-[36px] bg-gradient-to-r from-cyan-400 to-purple-600 opacity-20 filter blur-xs animate-pulse" />
              )}
            </div>
          </div>

          {/* Achievement Details */}
          <h4 className="text-xl font-extrabold text-white tracking-tight leading-tight mb-2 select-text">
            {badge.name}
          </h4>
          
          <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-[280px] mx-auto mb-7 select-text">
            {badge.description}
          </p>

          {/* Action Button */}
          <button
            onClick={() => {
              setActive(false)
              onClose()
            }}
            className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer shadow-lg ${s.btnBg}`}
          >
            ¡Impresionante!
          </button>
        </div>
      </div>
    </>
  )
}
