import { useEffect, useRef } from 'react'

// Fix 7: S등급 이상 팡파레 효과
const COLORS = ['#3D7EFF', '#60A5FA', '#C084FC', '#FFD700', '#4ADE80', '#F472B6', '#FB923C']

interface Particle {
  x: number; y: number
  vx: number; vy: number
  color: string; size: number
  life: number; maxLife: number
  rotation: number; rotationSpeed: number
}

export default function Fanfare() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()

    const particles: Particle[] = []

    const burst = (x: number, y: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.random() * Math.PI * 2)
        const speed = 3 + Math.random() * 8
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 5 + Math.random() * 8,
          life: 1, maxLife: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
        })
      }
    }

    // 초기 폭발
    const W = canvas.width, H = canvas.height
    burst(W * 0.2, H * 0.3, 30)
    burst(W * 0.8, H * 0.3, 30)
    burst(W * 0.5, H * 0.2, 40)

    // 추가 버스트
    const timers = [
      setTimeout(() => burst(W * 0.1, H * 0.5, 25), 400),
      setTimeout(() => burst(W * 0.9, H * 0.5, 25), 600),
      setTimeout(() => burst(W * 0.5, H * 0.4, 35), 800),
    ]

    let raf: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.25  // gravity
        p.vx *= 0.98
        p.life -= 0.018
        p.rotation += p.rotationSpeed

        if (p.life <= 0) { particles.splice(i, 1); continue }

        ctx.save()
        ctx.globalAlpha = p.life
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      }

      if (particles.length > 0) raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        width: '100%', height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
