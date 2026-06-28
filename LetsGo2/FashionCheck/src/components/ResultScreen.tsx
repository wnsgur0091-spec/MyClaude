import { useEffect, useRef, useState } from 'react'
import { FashionResult, Improvement, TIER_CONFIG } from '../types/fashion'
import ResultCard from './ResultCard'
import ImprovementModal from './ImprovementModal'
import StatsPanel from './StatsPanel'

interface Props {
  result: FashionResult
  imageUrl: string
  onRetry: () => void
}

const FIRST_SEEN_KEY = 'fashioncheck_seen_full'

export default function ResultScreen({ result, imageUrl, onRetry }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [selectedImprovement, setSelectedImprovement] = useState<Improvement | null>(null)
  const [hasShared, setHasShared] = useState(false)
  const [sharing, setSharing] = useState(false)

  const isHighScore = result.score >= 86
  const isFirstTime = !localStorage.getItem(FIRST_SEEN_KEY)
  const showFull = isFirstTime || isHighScore || hasShared

  useEffect(() => {
    if (isFirstTime) localStorage.setItem(FIRST_SEEN_KEY, '1')
  }, [isFirstTime])

  const handleShare = async () => {
    setSharing(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current!, { useCORS: true, scale: 2, backgroundColor: null })
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.92))
      const file = new File([blob], 'fashioncheck.jpg', { type: 'image/jpeg' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `나의 패션력: ${result.score}점` })
        setHasShared(true)
      } else {
        // fallback: download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'fashioncheck.jpg'; a.click()
        URL.revokeObjectURL(url)
        setHasShared(true)
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.error(err)
    } finally {
      setSharing(false)
    }
  }

  const cfg = TIER_CONFIG[result.tier]

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '20px 20px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>오늘의 결과 ⚡</h2>
          <button
            onClick={onRetry}
            style={{ fontSize: 13, color: 'var(--text-dim)', background: 'none', padding: '4px 8px' }}
          >
            다시 하기
          </button>
        </div>

        {/* Result Card */}
        <ResultCard ref={cardRef} result={result} imageUrl={imageUrl} showFull={showFull} />

        {/* Trigger hint (when not showing full) */}
        {!showFull && (
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: 'var(--surface)', borderRadius: 12,
            fontSize: 12, color: 'var(--text-dim)', textAlign: 'center',
          }}>
            공유하거나 고득점을 받으면 <strong style={{ color: 'var(--accent)' }}>상세 결과</strong>가 공개돼요 👀
          </div>
        )}

        {/* Tier + Score row */}
        {showFull && (
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <div style={{
              flex: 1, background: 'var(--surface)', borderRadius: 14, padding: '14px',
              border: `1px solid ${cfg.color}33`,
              boxShadow: `0 0 20px ${cfg.glow}`,
            }}>
              <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>패션 티어</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: cfg.color, marginTop: 2 }}>
                {cfg.emoji} {cfg.label}
              </p>
            </div>
            <div style={{
              flex: 1, background: 'var(--surface)', borderRadius: 14, padding: '14px',
            }}>
              <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>패션력</p>
              <p style={{ fontSize: 28, fontWeight: 900, marginTop: 2 }}>{result.score}<span style={{ fontSize: 14, color: 'var(--text-dim)' }}>/100</span></p>
            </div>
          </div>
        )}

        {/* Improvements */}
        {showFull && result.improvements.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>보완할 부분 (클릭해서 쇼핑 연결)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.improvements.map((imp, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImprovement(imp)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--surface)', borderRadius: 12, padding: '12px 14px',
                    textAlign: 'left', color: 'var(--text)',
                  }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>😈</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{imp.item}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>{imp.comment}</p>
                  </div>
                  <span style={{ fontSize: 16, color: 'var(--text-dim)' }}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Share Button */}
        <button
          onClick={handleShare}
          disabled={sharing}
          style={{
            marginTop: 16, width: '100%', padding: '15px',
            borderRadius: 14, fontSize: 15, fontWeight: 700,
            background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
            color: '#fff', opacity: sharing ? 0.7 : 1,
          }}
        >
          {sharing ? '캡처 중...' : '📸 SNS에 공유하기'}
        </button>
      </div>

      {/* Stats Panel (always visible, below scroll) */}
      <div style={{ marginTop: 20 }}>
        <StatsPanel stats={result.stats} />
      </div>

      <ImprovementModal item={selectedImprovement} onClose={() => setSelectedImprovement(null)} />
    </>
  )
}
