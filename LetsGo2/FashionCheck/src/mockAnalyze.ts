import { FashionResult, Gender, Situation, Tier, scoreToTier } from './types/fashion'

// Fix 2: 점수 구간별 로스트 풀 (점수와 일관성 유지)
const ROAST_BY_TIER: Record<Tier, string[]> = {
  'D': [
    '차라리 눈 감고 입는 게 더 나을 것 같아요 🙏',
    '이건 패션이 아니라 재난 수준이에요',
    '거울을 보고 나온 게 맞나요?',
    '오늘은 그냥 집에 계세요. 진심으로',
    '패션 테러리스트 1호로 신고합니다 🚨',
  ],
  'C': [
    '이 조합은 진짜 눈 테러예요 😵',
    '패션 감각을 처음부터 다시 키워야 할 것 같아요',
    '조합이 이게 최선이었나요...',
    '뭔가 많이 아쉬운데요, 많이',
    '색깔 감각이 좀 더 필요해 보여요',
  ],
  'B': [
    '그래도... 노력한 흔적이 보여요 😅',
    '나쁘진 않은데 2%가 계속 부족해요',
    '평균은 쳤어요. 딱 평균',
    '무난해요. 너무 무난해서 아쉽지만',
    '안전하게 입었네요. 좀 더 도전해봐요',
  ],
  'A': [
    '꽤 괜찮은데요? 조금만 더 신경 쓰면 S급이에요',
    '이 정도면 합격선은 충분히 넘었어요 👍',
    '센스가 보이는 코디예요, 조금 아쉽지만',
    '좋아요! 근데 완벽까지는 한 걸음 더',
    '상당히 잘 입으셨어요. 거의 다 왔어요',
  ],
  'S': [
    '인정... 오늘은 봐드리겠습니다 👏',
    '거의 패션왕 수준이에요. 거의요',
    '이 정도면 패션 좀 하는 분이시네요',
    '솔직히 멋있어요. 인정합니다 ✨',
    '오늘 코디는 합격! 아주 잘 하셨어요',
  ],
  'S+': [
    '완벽해요. 당신이 바로 패션왕입니다 👑',
    '이 코디는 교과서에 실려야 해요',
    '할 말이 없네요. 진심으로 완벽해요 🔥',
    '오늘 당신 때문에 다른 사람들이 초라해 보여요',
  ],
}

// Fix 1: 개선 멘트 풀 (다양하게)
const IMPROVEMENT_COMMENTS: Record<string, string[]> = {
  상의: ['원색은 좀 자제해 주세요', '이 색상은 눈 테러예요', '핏이 전혀 안 살아요', '상의가 전체를 망치고 있어요', '그냥 화이트 티로 바꾸세요'],
  하의: ['이 핏은 10년 전 유행이에요', '다리가 더 짧아 보여요', '컬러가 상의랑 전혀 안 맞아요', '치수가 맞긴 한 건가요?', '하의만 바꿔도 확 달라져요'],
  신발: ['신발이 코디의 발목을 잡네요', '이 신발은 다른 옷에 쓰세요', '굽 높이가 비율을 무너뜨려요', '운동화는 오늘 좀 쉬어요', '신발만 바꿔도 반은 먹어요'],
  액세서리: ['지금 목걸이가 너무 과해요', '액세서리가 주인공을 빼앗아요', '좀 더 심플한 걸로 교체해요', '없는 게 더 나을 수도 있어요', '이건 장식품이지 패션이 아니에요'],
  가방: ['가방이 전체 무드랑 따로 놀아요', '사이즈가 비율을 무너뜨려요', '컬러 매칭이 전혀 안 돼요', '이 가방은 다른 코디에 쓰세요'],
  모자: ['모자가 전체 분위기를 죽여요', '이 모자는 오늘 쉬어요', '스타일이 안 맞아요'],
  전체: ['처음부터 다시 시작하세요', '오늘은 집에 계세요, 진심으로', '코디 개념을 다시 배워야 해요', '이건 패션이 아니라 실험이에요'],
}

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const getComment = (item: string): string => {
  const key = Object.keys(IMPROVEMENT_COMMENTS).find((k) => item.includes(k))
  return key ? pickRandom(IMPROVEMENT_COMMENTS[key]) : pickRandom(IMPROVEMENT_COMMENTS['전체'])
}

const SITUATION_MODIFIER: Record<string, number> = {
  date: 0, business: -15, workout: -10, casual: 5, party: -8, travel: 3,
}

const SITUATION_PREFIX: Partial<Record<string, string>> = {
  business: '비즈니스 자리에 이 차림이요? ',
  workout:  '운동 가는 거 맞죠? 런웨이 아니에요. ',
  party:    '파티 분위기가 이게 아닌데... ',
}

// Fix 3: mock에서 성별 순환 (female/male/unknown/female)
const MOCK_GENDERS: Gender[] = ['female', 'male', 'unknown', 'female']

// Fix 6: 새 티어 기준에 맞는 베이스 결과
const BASE_RESULTS: Array<Omit<FashionResult, 'tier'> & { _baseScore: number }> = [
  {
    _baseScore: 25,   // C등급
    score: 25, roast: '', gender: 'female' as Gender,
    improvements: [
      { item: '상의', comment: '', searchQuery: '베이직 오버핏 티셔츠', pos: { x: 50, y: 35 } },
      { item: '하의', comment: '', searchQuery: '슬림 스트레이트 데님', pos: { x: 48, y: 67 } },
      { item: '신발', comment: '', searchQuery: '로퍼 캐주얼', pos: { x: 52, y: 88 } },
    ],
    stats: { coordination: 22, color: 35, fit: 28, trend: 20, vibe: 30 },
  },
  {
    _baseScore: 65,   // A등급
    score: 65, roast: '', gender: 'male' as Gender,
    improvements: [
      { item: '액세서리', comment: '', searchQuery: '미니멀 실버 체인 목걸이', pos: { x: 50, y: 23 } },
    ],
    stats: { coordination: 68, color: 72, fit: 60, trend: 58, vibe: 65 },
  },
  {
    _baseScore: 88,   // S등급
    score: 88, roast: '', gender: 'unknown' as Gender,
    improvements: [],
    stats: { coordination: 90, color: 86, fit: 92, trend: 88, vibe: 85 },
  },
  {
    _baseScore: 10,   // D등급
    score: 10, roast: '', gender: 'unknown' as Gender,
    improvements: [
      { item: '전체', comment: '', searchQuery: '데일리 코디 세트 추천', pos: { x: 50, y: 50 } },
    ],
    stats: { coordination: 8, color: 12, fit: 10, trend: 6, vibe: 14 },
  },
]

let mockIndex = 0

export async function mockAnalyze(situation?: Situation): Promise<FashionResult> {
  await new Promise((r) => setTimeout(r, 3000))

  const idx = mockIndex % BASE_RESULTS.length
  const base = BASE_RESULTS[idx]
  const mockGender = MOCK_GENDERS[idx]
  mockIndex++

  const modifier = situation ? (SITUATION_MODIFIER[situation] ?? 0) : 0
  const score = Math.max(0, Math.min(100, base._baseScore + modifier))
  const tier = scoreToTier(score)

  // Fix 2: 점수와 일관된 로스트
  const prefix = situation ? (SITUATION_PREFIX[situation] ?? '') : ''
  const roast = prefix + pickRandom(ROAST_BY_TIER[tier])

  const statAdj = (v: number) => Math.max(0, Math.min(100, v + modifier))
  const improvements = base.improvements.map((imp) => ({ ...imp, comment: getComment(imp.item) }))

  return {
    score,
    tier,
    roast,
    improvements,
    gender: mockGender,
    stats: {
      coordination: statAdj(base.stats.coordination),
      color:        statAdj(base.stats.color),
      fit:          statAdj(base.stats.fit),
      trend:        statAdj(base.stats.trend),
      vibe:         statAdj(base.stats.vibe),
    },
  }
}

export async function mockGenerateAICard(imageUrl: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 2400))

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const W = img.width, H = img.height
      const canvas = document.createElement('canvas')
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d')!

      ctx.filter = 'brightness(1.12) contrast(1.18) saturate(1.6) hue-rotate(5deg)'
      ctx.drawImage(img, 0, 0)
      ctx.filter = 'none'

      const shadowGrad = ctx.createLinearGradient(0, H * 0.6, 0, H)
      shadowGrad.addColorStop(0, 'rgba(0,30,80,0)')
      shadowGrad.addColorStop(1, 'rgba(0,30,80,0.35)')
      ctx.fillStyle = shadowGrad; ctx.fillRect(0, 0, W, H)

      const spotlight = ctx.createRadialGradient(W * 0.5, H * 0.35, 0, W * 0.5, H * 0.35, W * 0.7)
      spotlight.addColorStop(0, 'rgba(255,245,220,0.12)')
      spotlight.addColorStop(1, 'rgba(0,0,0,0.22)')
      ctx.fillStyle = spotlight; ctx.fillRect(0, 0, W, H)

      const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.78)
      vignette.addColorStop(0, 'rgba(0,0,0,0)')
      vignette.addColorStop(1, 'rgba(0,0,0,0.55)')
      ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H)

      const bannerH = H * 0.08
      const bannerGrad = ctx.createLinearGradient(0, 0, W, 0)
      bannerGrad.addColorStop(0, 'rgba(29,78,216,0.95)')
      bannerGrad.addColorStop(0.5, 'rgba(61,126,255,0.95)')
      bannerGrad.addColorStop(1, 'rgba(96,165,250,0.95)')
      ctx.fillStyle = bannerGrad; ctx.fillRect(0, 0, W, bannerH)
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${H * 0.038}px -apple-system, sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('✨ AI 패션 개선 버전', W / 2, bannerH / 2)

      const botH = H * 0.1
      const botGrad = ctx.createLinearGradient(0, 0, W, 0)
      botGrad.addColorStop(0, 'rgba(96,165,250,0.9)')
      botGrad.addColorStop(1, 'rgba(29,78,216,0.9)')
      ctx.fillStyle = botGrad; ctx.fillRect(0, H - botH, W, botH)
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${H * 0.034}px -apple-system, sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('보완 포인트 반영 완료 👗🔥', W / 2, H - botH / 2)

      ctx.save()
      ctx.translate(W * 0.06, H * 0.5); ctx.rotate(-Math.PI / 2)
      ctx.font = `600 ${H * 0.022}px -apple-system, sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('FASHION CHECK AI EDITION', 0, 0)
      ctx.restore()

      ctx.font = `bold ${H * 0.022}px -apple-system, sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'
      ctx.fillText('FashionCheck', W - W * 0.04, H - botH - H * 0.015)

      resolve(canvas.toDataURL('image/jpeg', 0.93))
    }
    img.onerror = () => resolve(imageUrl)  // fallback
    img.src = imageUrl
  })
}
