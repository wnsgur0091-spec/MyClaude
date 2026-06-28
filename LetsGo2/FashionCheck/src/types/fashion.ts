// Fix 6: 새 티어 시스템 (D/C/B/A/S/S+)
export type Tier = 'D' | 'C' | 'B' | 'A' | 'S' | 'S+'
export type Situation = 'date' | 'business' | 'workout' | 'casual' | 'party' | 'travel'
export type Gender = 'male' | 'female' | 'unknown'

export interface Improvement {
  item: string
  comment: string
  searchQuery: string
  pos?: { x: number; y: number }
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
  gender?: Gender
}

export type AppState = 'idle' | 'analyzing' | 'result' | 'error'

export const TIER_CONFIG: Record<Tier, { label: string; color: string; emoji: string; glow: string }> = {
  'D':  { label: 'D등급', color: '#888888', emoji: '💀', glow: 'rgba(136,136,136,0.3)' },
  'C':  { label: 'C등급', color: '#CD7F32', emoji: '🥉', glow: 'rgba(205,127,50,0.35)' },
  'B':  { label: 'B등급', color: '#4ADE80', emoji: '⭐', glow: 'rgba(74,222,128,0.35)' },
  'A':  { label: 'A등급', color: '#3D7EFF', emoji: '💠', glow: 'rgba(61,126,255,0.45)'  },
  'S':  { label: 'S등급', color: '#C084FC', emoji: '🏆', glow: 'rgba(192,132,252,0.5)'  },
  'S+': { label: 'S+등급', color: '#FFD700', emoji: '✨', glow: 'rgba(255,215,0,0.65)'  },
}

export const SITUATION_LABELS: Record<Situation, string> = {
  date:     '소개팅 💑',
  business: '비즈니스 🤝',
  workout:  '운동 🏋️',
  casual:   '캐주얼 ☕',
  party:    '파티 🎉',
  travel:   '여행 ✈️',
}

// Fix 6: 새 점수→티어 변환
export const scoreToTier = (score: number): Tier => {
  if (score >= 100) return 'S+'
  if (score >= 81)  return 'S'
  if (score >= 61)  return 'A'
  if (score >= 41)  return 'B'
  if (score >= 21)  return 'C'
  return 'D'
}

export const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  상의:    { x: 50, y: 38 },
  아우터:  { x: 50, y: 38 },
  자켓:    { x: 50, y: 38 },
  하의:    { x: 50, y: 65 },
  바지:    { x: 50, y: 65 },
  스커트:  { x: 50, y: 65 },
  신발:    { x: 50, y: 88 },
  가방:    { x: 80, y: 55 },
  액세서리:{ x: 28, y: 22 },
  목걸이:  { x: 50, y: 25 },
  모자:    { x: 50, y: 12 },
  전체:    { x: 50, y: 50 },
}

export const getImprovementPos = (item: string, pos?: { x: number; y: number }) => {
  if (pos) return pos
  const key = Object.keys(DEFAULT_POSITIONS).find((k) => item.includes(k))
  return key ? DEFAULT_POSITIONS[key] : { x: 50, y: 50 }
}

// Fix 3: URL은 성별 포함 — 표시 텍스트는 원래 쿼리 유지
export const getShopLinks = (searchQuery: string, gender?: Gender) => {
  const suffix = gender === 'female' ? ' 여성' : gender === 'male' ? ' 남성' : ''
  const alreadyHas = searchQuery.includes('여성') || searchQuery.includes('남성')
  const urlQ = alreadyHas ? searchQuery : searchQuery + suffix
  return [
    { name: '무신사', url: `https://www.musinsa.com/search/musinsa/integration?q=${encodeURIComponent(urlQ)}`, color: '#0B0B0B' },
    { name: '29CM',   url: `https://search.29cm.co.kr/search?query=${encodeURIComponent(urlQ)}`,              color: '#1A1A1A' },
    { name: 'W컨셉',  url: `https://www.wconcept.co.kr/Search?keyword=${encodeURIComponent(urlQ)}`,           color: '#222'    },
  ]
}
