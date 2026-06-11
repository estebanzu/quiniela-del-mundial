'use client'

import { useEffect, useRef } from 'react'

export function FireEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = canvas.width = canvas.offsetWidth
    let height = canvas.height = canvas.offsetHeight

    // Handle resize
    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = canvas.offsetWidth
      height = canvas.height = canvas.offsetHeight
    }
    window.addEventListener('resize', handleResize)

    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      color: string
      alpha: number
      decay: number
      gravity?: number
    }

    const particles: Particle[] = []

    // 1. Initial firework explosion
    const createExplosion = () => {
      const colors = [
        'rgba(249, 115, 22, ',  // orange-500
        'rgba(234, 179, 8, ',   // yellow-500
        'rgba(239, 68, 68, ',   // red-500
        'rgba(253, 224, 71, ',  // yellow-300
      ]
      
      const centerX = width / 2
      const centerY = height / 2

      for (let i = 0; i < 45; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 3 + 1.2
        const color = colors[Math.floor(Math.random() * colors.length)]
        particles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.6, // slightly upward push
          size: Math.random() * 3 + 1,
          color,
          alpha: 1,
          decay: Math.random() * 0.025 + 0.015,
          gravity: 0.035, // gravity pulls sparks down
        })
      }
    }

    createExplosion()

    // 2. Rising embers
    const spawnEmber = () => {
      if (particles.length > 70) return // Limit total particles
      const colors = [
        'rgba(249, 115, 22, ',  // orange-500
        'rgba(234, 179, 8, ',   // yellow-500
        'rgba(245, 158, 11, ',  // amber-500
      ]
      const color = colors[Math.floor(Math.random() * colors.length)]
      particles.push({
        x: Math.random() * width,
        y: height + 5,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(Math.random() * 1.0 + 0.4),
        size: Math.random() * 2 + 0.8,
        color,
        alpha: Math.random() * 0.6 + 0.4,
        decay: Math.random() * 0.012 + 0.006,
      })
    }

    // Main animation loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height)

      // Randomly spawn rising embers
      if (Math.random() < 0.3) {
        spawnEmber()
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        
        // Update physics
        p.x += p.vx
        p.y += p.vy
        if (p.gravity) {
          p.vy += p.gravity
        }
        p.alpha -= p.decay

        // Remove dead or offscreen particles
        if (p.alpha <= 0 || p.x < -10 || p.x > width + 10 || p.y < -10 || p.y > height + 20) {
          particles.splice(i, 1)
          continue
        }

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${p.alpha})`
        ctx.fill()
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 w-full h-full"
    />
  )
}
