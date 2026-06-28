import { useEffect, useState } from 'react'

const MESSAGES = [
  '패션왕이 눈을 찡그리는 중...',
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
      alignItems: 'center', justifyContent: 'center', gap: 28, padding: 40,
    }}>
      {/* Fix 1: ⚡ emoji 대신 블루 CSS 애니메이션 스피너 */}
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        {/* 외부 회전 링 */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '3px solid transparent',
          borderTopColor: '#3D7EFF',
          borderRightColor: '#60A5FA',
          animation: 'spin 1.2s linear infinite',
        }} />
        {/* 내부 펄스 원 */}
        <div style={{
          position: 'absolute', inset: 10, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(61,126,255,0.25) 0%, transparent 70%)',
          animation: 'pulse 1.6s ease-in-out infinite',
        }} />
        {/* 중앙 아이콘 */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
        }}>👗</div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', minHeight: 24 }}>
          {MESSAGES[msgIdx]}{dots}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
          패션왕이 당신의 스타일을 분석하고 있어요
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:0.4;transform:scale(0.95)} 50%{opacity:1;transform:scale(1.05)} }
      `}</style>
    </div>
  )
}
