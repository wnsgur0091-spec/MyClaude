export type Tier = 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'challenger'
export type Situation = 'date' | 'business' | 'workout' | 'casual' | 'party' | 'travel'

export interface Improvement {
  item: string
  comment: string
  searchQuery: string
}

export interface FashionStats {
  coordination: number
  color: number
  fit: number
  trend: number
  vibe: number
}

export interface FashionResult {
  score: number
  tier: Tier
  roast: string
  improvements: Improvement[]
  stats: FashionStats
}

export type AppState = 'idle' | 'analyzing' | 'result' | 'error'

export const TIER_CONFIG: Record<Tier, { label: string; color: string; emoji: string; glow: string }> = {
  iron:       { label: '아이언',    color: '#8B7D7B', emoji: '🔩', glow: 'rgba(139,125,123,0.4)' },
  bronze:     { label: '브론즈',    color: '#CD7F32', emoji: '🥉', glow: 'rgba(205,127,50,0.4)'  },
  silver:     { label: '실버',      color: '#C0C0C0', emoji: '🥈', glow: 'rgba(192,192,192,0.4)' },
  gold:       { label: '골드',      color: '#FFD700', emoji: '🥇', glow: 'rgba(255,215,0,0.5)'   },
  platinum:   { label: '플래티넘',  color: '#B0E0E6', emoji: '⚗️', glow: 'rgba(176,224,230,0.4)' },
  diamond:    { label: '다이아',    color: '#89CFF0', emoji: '💎', glow: 'rgba(137,207,240,0.5)' },
  challenger: { label: '챌린저',    color: '#FF6B35', emoji: '🔥', glow: 'rgba(255,107,53,0.6)'  },
}

export const SITUATION_LABELS: Record<Situation, string> = {
  date:     '소개팅 💑',
  business: '비즈니스 미팅 🤝',
  workout:  '운동 🏋️',
  casual:   '캐주얼 데이 ☕',
  party:    '파티 🎉',
  travel:   '여행 ✈️',
}

export const scoreToTier = (score: number): Tier => {
  if (score >= 94) return 'challenger'
  if (score >= 86) return 'diamond'
  if (score >= 71) return 'platinum'
  if (score >= 51) return 'gold'
  if (score >= 31) return 'silver'
  if (score >= 16) return 'bronze'
  return 'iron'
}

export const getShopLinks = (searchQuery: string) => [
  { name: '무신사', url: `https://www.musinsa.com/search/musinsa/integration?q=${encodeURIComponent(searchQuery)}`, color: '#0B0B0B' },
  { name: '29CM',   url: `https://search.29cm.co.kr/search?query=${encodeURIComponent(searchQuery)}`,            color: '#1A1A1A' },
  { name: 'W컨셉',  url: `https://www.wconcept.co.kr/Search?keyword=${encodeURIComponent(searchQuery)}`,         color: '#222' },
]
