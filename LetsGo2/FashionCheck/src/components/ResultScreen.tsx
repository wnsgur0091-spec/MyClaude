import { useState } from 'react'
import { FashionResult, Improvement, TIER_CONFIG } from '../types/fashion'
import { useCountUp } from '../hooks/useCountUp'
import ResultCard from './ResultCard'
import ImprovementModal from './ImprovementModal'
import StatsPanel from './StatsPanel'
import ShareModal from './ShareModal'
import Fanfare from './Fanfare'

interface Props {
  result: FashionResult
  imageUrl: string
  onRetry: () => void
}

const FIRST_SEEN_KEY = 'fashioncheck_seen_full'

export default function ResultScreen({ result, imageUrl, onRetry }: Props) {
  const [selectedImprovement, setSelectedImprovement] = useState<Improvement | null>(null)
  const [hasShared, setHasShared] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  const isHighScore = result.score >= 81  // S등급 이상
  const isFirstTime = !localStorage.getItem(FIRST_SEEN_KEY)
  const showFull = isFirstTime || isHighScore || hasShared
  const showFanfare = result.score >= 81  // Fix 7: S등급 이상 팡파레

  if (isFirstTime) localStorage.setItem(FIRST_SEEN_KEY, '1')

  // Fix 7: 점수 카운트업 애니메이션
  const animatedScore = useCountUp(result.score, 1600, 400)

  const cfg = TIER_CONFIG[result.tier]

  return (
    <>
      {/* Fix 7: S등급 이상 팡파레 */}
      {showFanfare && <Fanfare />}

      <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 20px 0', gap: 12 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>오늘의 결과 ✦</h2>
          <button
            onClick={onRetry}
            style={{ fontSize: 13, color: 'var(--text-dim)', background: 'none', padding: '4px 8px' }}
          >
            다시 하기
          </button>
        </div>

        {/* Result Card */}
        <ResultCard
          result={result}
          imageUrl={imageUrl}
          showFull={showFull}
          onImprovementClick={setSelectedImprovement}
        />

        {/* Fix 5: 힌트 문구 변경 */}
        {result.improvements.length > 0 && (
          <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', margin: '-4px 0' }}>
            사진 위 😈 을 탭하면 <strong style={{ color: 'var(--accent)' }}>패션왕의 추천을 볼 수 있어요</strong>
          </p>
        )}

        {/* 패션왕의 조언 — 말풍선 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, paddingLeft: 10 }}>
            <span style={{ fontSize: 22, filter: 'drop-shadow(1px 1px 0 #000)' }}>👑</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.5px' }}>패션왕의 조언</span>
          </div>
          <div className="speech-bubble" style={{
            padding: '14px 16px', background: 'var(--surface)',
          }}>
            <p style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>"{result.roast}"</p>
          </div>
        </div>

        {/* 트리거 힌트 */}
        {!showFull && (
          <div className="cartoon-card" style={{
            padding: '10px 14px', background: 'var(--surface)', borderRadius: 12,
            fontSize: 12, color: 'var(--text-dim)', textAlign: 'center',
          }}>
            {result.score >= 61
              ? '📸 SNS로 친구들에게도 자랑해보세요!'
              : '📸 SNS로 친구들한테도 피드백 받아보세요!'}
          </div>
        )}

        {/* 티어 + 점수 카드 */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="cartoon-card" style={{
            flex: 1, background: 'var(--surface)', borderRadius: 14, padding: 14,
            borderColor: cfg.color + ' !important',
          }}>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700 }}>패션 티어</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: cfg.color, marginTop: 4,
              filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.5))' }}>
              {cfg.emoji} {cfg.label}
            </p>
          </div>
          <div className="cartoon-card" style={{
            flex: 1, background: 'var(--surface)', borderRadius: 14, padding: 14,
          }}>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700 }}>패션력</p>
            <p style={{ fontSize: 30, fontWeight: 900, marginTop: 4, color: cfg.color,
              filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.5))' }}>
              {animatedScore}
              <span style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 400 }}>/100</span>
            </p>
          </div>
        </div>

        {/* 공유 버튼 */}
        <button
          onClick={() => setShowShareModal(true)}
          className="cartoon-btn"
          style={{
            width: '100%', padding: 15, borderRadius: 14, fontSize: 15, fontWeight: 800,
            background: 'linear-gradient(135deg, #1D4ED8, #3D7EFF, #60A5FA)',
            color: '#fff',
          }}
        >
          📸 SNS에 공유하기
        </button>

        {/* Fix 2: 구분선 + 상세 스탯 */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <StatsPanel stats={result.stats} />
        </div>
      </div>

      {/* Fix 4: gender 전달 */}
      <ImprovementModal
        item={selectedImprovement}
        gender={result.gender}
        onClose={() => setSelectedImprovement(null)}
      />
      {showShareModal && (
        <ShareModal
          result={result}
          imageUrl={imageUrl}
          onClose={() => setShowShareModal(false)}
          onShared={() => setHasShared(true)}
        />
      )}
    </>
  )
}
