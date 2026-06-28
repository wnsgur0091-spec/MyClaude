import { useEffect, useState } from 'react'

// Fix 7: 점수 카운트업 훅
export function useCountUp(target: number, duration = 1600, delay = 300) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let frame: number
    const startTime = performance.now() + delay

    const tick = (now: number) => {
      if (now < startTime) { frame = requestAnimationFrame(tick); return }
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(ease * target))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration, delay])

  return count
}
