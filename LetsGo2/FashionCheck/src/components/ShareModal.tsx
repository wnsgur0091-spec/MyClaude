import { useEffect, useRef, useState } from 'react'
import { FashionResult, TIER_CONFIG } from '../types/fashion'
import { generateShareCard } from '../utils/shareCard'

interface Props {
  result: FashionResult
  imageUrl: string
  onClose: () => void
  onShared: () => void
}

const SNS_APPS = [
  { id: 'instagram', label: '인스타그램', emoji: '📸', color: '#E1306C' },
  { id: 'tiktok',    label: '틱톡',       emoji: '🎵', color: '#000' },
  { id: 'kakao',     label: '카카오톡',   emoji: '💬', color: '#FEE500' },
  { id: 'other',     label: '기타 앱',    emoji: '⋯',  color: '#555' },
]

type GenState = 'idle' | 'generating' | 'ready'

export default function ShareModal({ result, imageUrl, onClose, onShared }: Props) {
  const [genState, setGenState] = useState<GenState>('idle')
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const startedRef = useRef(false)

  const cfg = TIER_CONFIG[result.tier]

  // AI 카드 자동 생성 시작
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    setGenState('generating')

    const generate = async () => {
      try {
        const url = await generateShareCard(imageUrl, result)
        setAiImageUrl(url)
      } catch {
        setAiImageUrl(imageUrl)
      } finally {
        setGenState('ready')
      }
    }
    generate()
  }, [imageUrl, result])

  const handleShare = async (appId: string) => {
    if (sharing || !aiImageUrl) return
    setSharing(true)

    try {
      // 이미지 → File 변환
      const res = await fetch(aiImageUrl)
      const blob = await res.blob()
      const file = new File([blob], 'fashioncheck.jpg', { type: 'image/jpeg' })
      const shareText = `오늘의 패션력 ${result.score}점 | ${cfg.label} 티어 🔥 #FashionCheck #패션체크`

      if (appId === 'kakao') {
        // 카카오톡: 이미지 공유 후 앱 열기 시도
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text: shareText })
        } else {
          window.open(`https://story.kakao.com/share?url=${encodeURIComponent(window.location.href)}`, '_blank')
        }
      } else {
        // 인스타/틱톡/기타: Web Share API → OS가 앱 선택 시트 띄움
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'FashionCheck 결과', text: shareText })
        } else {
          // PC fallback: 이미지 다운로드
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = 'fashioncheck.jpg'; a.click()
          URL.revokeObjectURL(url)
        }
      }
      onShared()
      onClose()
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.error(err)
    } finally {
      setSharing(false)
    }
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 430, margin: '0 auto',
          background: '#181818', borderRadius: '24px 24px 0 0',
          paddingBottom: 40, animation: 'slideUp 0.25s ease',
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: '#333', borderRadius: 99, margin: '14px auto 0' }} />

        {/* 공유 카드 미리보기 — 9:16 비율로 중앙 표시 */}
        <div style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 10, alignSelf: 'flex-start' }}>
            공유할 카드 미리보기
          </p>
          <div style={{
            width: '58%',
            aspectRatio: '9/16',
            borderRadius: 16, overflow: 'hidden',
            background: '#111', position: 'relative',
            border: '2px solid #333',
            boxShadow: '4px 4px 0 #000',
          }}>
            {genState === 'generating' && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 10, background: '#0a0a0a',
              }}>
                <div style={{ fontSize: 32, animation: 'spin 1.5s linear infinite' }}>✨</div>
                <p style={{ fontSize: 12, color: '#888' }}>카드 생성 중...</p>
              </div>
            )}
            {aiImageUrl && (
              <img src={aiImageUrl} alt="공유 카드" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
        </div>

        {/* SNS 앱 버튼들 */}
        <div style={{ padding: '18px 20px 0' }}>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>공유할 앱 선택</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {SNS_APPS.map((app) => (
              <button
                key={app.id}
                disabled={genState !== 'ready' || sharing}
                onClick={() => handleShare(app.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '14px 8px',
                  background: genState === 'ready' ? '#242424' : '#1a1a1a',
                  borderRadius: 16, color: '#fff',
                  opacity: genState === 'ready' ? 1 : 0.4,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 26 }}>{app.emoji}</span>
                <span style={{ fontSize: 11, color: '#aaa' }}>{app.label}</span>
              </button>
            ))}
          </div>
        </div>

        {genState !== 'ready' && (
          <p style={{ textAlign: 'center', fontSize: 12, color: '#555', marginTop: 14 }}>
            AI 카드 생성 완료 후 공유 가능해요
          </p>
        )}
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
