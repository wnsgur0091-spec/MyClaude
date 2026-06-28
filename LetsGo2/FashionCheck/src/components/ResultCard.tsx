import { forwardRef } from 'react'
import { FashionResult, TIER_CONFIG } from '../types/fashion'

interface Props {
  result: FashionResult
  imageUrl: string
  showFull: boolean
}

// Sticker that always shows on the photo
function ScoreSticker({ score, tier }: { score: number; tier: FashionResult['tier'] }) {
  const cfg = TIER_CONFIG[tier]
  return (
    <div style={{
      position: 'absolute', top: 16, right: 16,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)',
      borderRadius: 14, padding: '10px 14px',
      border: `1.5px solid ${cfg.color}`,
      boxShadow: `0 0 16px ${cfg.glow}`,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: cfg.color, lineHeight: 1 }}>{score}</div>
      <div style={{ fontSize: 10, color: '#ccc', marginTop: 2 }}>패션력</div>
    </div>
  )
}

// Full overlay — shown on trigger
function FullOverlay({ result }: { result: FashionResult }) {
  const cfg = TIER_CONFIG[result.tier]
  return (
    <>
      {/* Tier badge top-left */}
      <div style={{
        position: 'absolute', top: 16, left: 16,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)',
        borderRadius: 12, padding: '8px 12px',
        border: `1.5px solid ${cfg.color}`,
        boxShadow: `0 0 16px ${cfg.glow}`,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: cfg.color }}>{cfg.label}</span>
      </div>

      {/* Bottom gradient + roast */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
        padding: '60px 16px 20px',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.08)', borderRadius: 12,
          padding: '12px 14px', backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>AI 한줄평 💬</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>"{result.roast}"</p>
        </div>
      </div>

      {/* Watermark */}
      <div style={{
        position: 'absolute', bottom: 10, right: 14,
        fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600,
      }}>
        FashionCheck
      </div>
    </>
  )
}

const ResultCard = forwardRef<HTMLDivElement, Props>(({ result, imageUrl, showFull }, ref) => {
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
        src={imageUrl}
        alt="OOTD"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <ScoreSticker score={result.score} tier={result.tier} />
      {showFull && <FullOverlay result={result} />}
    </div>
  )
})

ResultCard.displayName = 'ResultCard'
export default ResultCard
