import { useEffect, useState } from 'react'

const MESSAGES = [
  '패션 AI가 눈을 찡그리는 중...',
  '전문가 독설 준비 중...',
  '오늘의 패션력 계산 중...',
  '스타일 범죄 여부 확인 중...',
  '패션 경찰 출동 요청 중...',
]

export default function LoadingScreen() {
  const [msgIdx, setMsgIdx] = useState(0)
  const [dots, setDots] = useState('')

  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIdx((i) => (i + 1) % MESSAGES.length), 2000)
    const dotTimer = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 400)
    return () => { clearInterval(msgTimer); clearInterval(dotTimer) }
  }, [])

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24, padding: 40,
    }}>
      <div style={{ fontSize: 60, animation: 'spin 2s linear infinite' }}>⚡</div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', minHeight: 24 }}>
          {MESSAGES[msgIdx]}{dots}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
          AI가 당신의 스타일을 분석하고 있어요
        </p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) scale(1); } 50% { transform: rotate(180deg) scale(1.2); } to { transform: rotate(360deg) scale(1); } }`}</style>
    </div>
  )
}
