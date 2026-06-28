import { FashionStats } from '../types/fashion'

interface Props { stats: FashionStats }

const STAT_META: { key: keyof FashionStats; label: string; emoji: string; roast: (v: number) => string }[] = [
  { key: 'coordination', label: '코디력',    emoji: '🎯', roast: (v) => v < 40 ? '길에서 주운 조합?' : v < 70 ? '그럭저럭' : '신의 코디' },
  { key: 'color',        label: '컬러 감각', emoji: '🎨', roast: (v) => v < 40 ? '색맹 의심됨' : v < 70 ? '무난무난' : '컬러 천재' },
  { key: 'fit',          label: '핏',        emoji: '📐', roast: (v) => v < 40 ? '사이즈가 뭐죠?' : v < 70 ? '입을만 함' : '핏 장인' },
  { key: 'trend',        label: '트렌드',    emoji: '📈', roast: (v) => v < 40 ? '5년 전 패션?' : v < 70 ? '평균 수준' : '트렌드세터' },
  { key: 'vibe',         label: '바이브',    emoji: '✨', roast: (v) => v < 40 ? '뭘 표현하려고?' : v < 70 ? '평범한 에너지' : '존재 자체가 패션' },
]

export default function StatsPanel({ stats }: Props) {
  // Fix 5: 최고 스탯 강조
  const maxKey = (Object.entries(stats) as [keyof FashionStats, number][])
    .reduce((a, b) => a[1] > b[1] ? a : b)[0]

  return (
    <div style={{ padding: '0 0 8px' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text-dim)' }}>
        📊 상세 스탯 (정밀 분석)
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {STAT_META.map(({ key, label, emoji, roast }) => {
          const value = stats[key]
          const isMax = key === maxKey
          const barColor = value >= 70 ? '#60A5FA' : value >= 40 ? '#93C5FD' : '#BFDBFE'

          return (
            <div
              key={key}
              style={{
                padding: isMax ? '10px 12px' : undefined,
                borderRadius: isMax ? 12 : undefined,
                background: isMax ? 'rgba(61,126,255,0.07)' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, fontWeight: isMax ? 700 : 600 }}>
                  {emoji} {label}
                  {isMax && (
                    <span style={{
                      marginLeft: 6, fontSize: 10, fontWeight: 700,
                      color: 'var(--accent)', background: 'rgba(61,126,255,0.15)',
                      padding: '1px 6px', borderRadius: 50,
                    }}>BEST</span>
                  )}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{roast(value)}</span>
                  <span style={{
                    fontSize: isMax ? 16 : 14, fontWeight: 700,
                    color: isMax ? 'var(--accent)' : barColor,
                  }}>{value}</span>
                </div>
              </div>
              <div style={{ height: isMax ? 8 : 6, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${value}%`,
                  background: isMax ? 'linear-gradient(90deg, #1D4ED8, #60A5FA)' : barColor,
                  borderRadius: 99, transition: 'width 1s ease',
                  boxShadow: isMax ? '0 0 8px rgba(61,126,255,0.5)' : undefined,
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
