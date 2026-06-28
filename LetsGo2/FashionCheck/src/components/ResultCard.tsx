import { forwardRef } from 'react'
import { FashionResult, Improvement, TIER_CONFIG, getImprovementPos } from '../types/fashion'

interface Props {
  result: FashionResult
  imageUrl: string
  showFull: boolean
  onImprovementClick?: (imp: Improvement) => void
  /** AI 생성 이미지 URL — 있으면 원본 대신 표시 */
  aiImageUrl?: string | null
}

function ScoreSticker({ score, tier }: { score: number; tier: FashionResult['tier'] }) {
  const cfg = TIER_CONFIG[tier]
  return (
    <div style={{
      position: 'absolute', top: 14, right: 14,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)',
      borderRadius: 14, padding: '10px 14px',
      border: `1.5px solid ${cfg.color}`,
      boxShadow: `0 0 16px ${cfg.glow}`,
      textAlign: 'center', pointerEvents: 'none',
    }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: cfg.color, lineHeight: 1 }}>{score}</div>
      <div style={{ fontSize: 10, color: '#ccc', marginTop: 2 }}>패션력</div>
    </div>
  )
}

function ImprovementStickers({ improvements, onClick }: {
  improvements: Improvement[]
  onClick?: (imp: Improvement) => void
}) {
  return (
    <>
      {improvements.map((imp, i) => {
        const pos = getImprovementPos(imp.item, imp.pos)
        return (
          <button
            key={i}
            onClick={() => onClick?.(imp)}
            title={imp.item}
            style={{
              position: 'absolute',
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
              backdropFilter: 'blur(6px)',
              border: '1.5px solid rgba(61,126,255,0.9)',
              borderRadius: 50,
              width: 40, height: 40,
              fontSize: 18,
              cursor: onClick ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(29,78,216,0.55)',
              boxShadow: '0 0 12px rgba(61,126,255,0.65)',
              animation: 'pulse 2s infinite',
              zIndex: 2,
            }}
          >
            😈
          </button>
        )
      })}
      <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 8px rgba(61,126,255,0.4)} 50%{box-shadow:0 0 18px rgba(61,126,255,0.9)} }`}</style>
    </>
  )
}

// Fix 4: 티어 뱃지는 항상 표시
function TierBadge({ tier }: { tier: FashionResult['tier'] }) {
  const cfg = TIER_CONFIG[tier]
  return (
    <div style={{
      position: 'absolute', top: 14, left: 14,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)',
      borderRadius: 12, padding: '8px 12px',
      border: `1.5px solid ${cfg.color}`,
      boxShadow: `0 0 16px ${cfg.glow}`,
      display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none',
      zIndex: 3,
    }}>
      <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: cfg.color }}>{cfg.label}</span>
    </div>
  )
}

function Watermark() {
  return (
    <div style={{
      position: 'absolute', bottom: 10, right: 14,
      fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, pointerEvents: 'none',
      zIndex: 3,
    }}>
      FashionCheck
    </div>
  )
}

const ResultCard = forwardRef<HTMLDivElement, Props>(
  ({ result, imageUrl, showFull, onImprovementClick, aiImageUrl }, ref) => {
    const displayImage = aiImageUrl ?? imageUrl
    return (
      <div
        ref={ref}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3/4',
          borderRadius: 20,
          overflow: 'hidden',
          background: '#000',
          flexShrink: 0,
        }}
      >
        <img
          src={displayImage}
          alt="OOTD"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          crossOrigin="anonymous"
        />

        {/* 😈 보완 스티커 — 항상 사진 위에 표시 */}
        {result.improvements.length > 0 && (
          <ImprovementStickers
            improvements={result.improvements}
            onClick={onImprovementClick}
          />
        )}

        <TierBadge tier={result.tier} />
        <ScoreSticker score={result.score} tier={result.tier} />
        {showFull && !aiImageUrl && <Watermark />}
      </div>
    )
  }
)

ResultCard.displayName = 'ResultCard'
export default ResultCard
