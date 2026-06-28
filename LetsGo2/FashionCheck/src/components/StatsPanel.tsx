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
  return (
    <div style={{ padding: '0 20px 32px' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text-dim)' }}>
        📊 상세 스탯 (정밀 분석)
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {STAT_META.map(({ key, label, emoji, roast }) => {
          const value = stats[key]
          const color = value >= 70 ? '#4ade80' : value >= 40 ? '#facc15' : '#f87171'
          return (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{emoji} {label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{roast(value)}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
                </div>
              </div>
              <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${value}%`, background: color,
                  borderRadius: 99, transition: 'width 1s ease',
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
