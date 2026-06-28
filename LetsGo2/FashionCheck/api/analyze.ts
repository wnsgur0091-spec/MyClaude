import type { VercelRequest, VercelResponse } from '@vercel/node'
import Replicate from 'replicate'
import { scoreToTier } from '../src/types/fashion'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

const SITUATION_CONTEXT: Record<string, string> = {
  date:     '소개팅 (first date)',
  business: '비즈니스 미팅 (business meeting)',
  workout:  '운동 (workout/gym)',
  casual:   '캐주얼 데이 (casual outing)',
  party:    '파티 (party/club)',
  travel:   '여행 (travel)',
}

const PROMPT = (situation?: string) => `You are a savage but witty Korean fashion critic. Analyze this outfit photo.
${situation ? `Context: dressed for ${SITUATION_CONTEXT[situation] ?? situation}` : ''}

IMPORTANT: First detect the gender of the person (남성/여성/unknown). Use ONLY gender-appropriate Korean shopping search terms in searchQuery fields. For 남성 use male clothing terms, for 여성 use female clothing terms.

Return ONLY valid JSON (no markdown, no explanation):
{
  "gender": "<남성|여성|unknown>",
  "score": <integer 0-100>,
  "roast": "<Korean savage roast, max 35 chars, be funny & cutting>",
  "improvements": [
    {
      "item": "<clothing item in Korean e.g. 상의/하의/신발/가방/액세서리>",
      "comment": "<what's wrong, Korean, max 20 chars>",
      "searchQuery": "<gender-appropriate Korean search keyword for a better replacement>"
    }
  ],
  "stats": {
    "coordination": <0-100>,
    "color": <0-100>,
    "fit": <0-100>,
    "trend": <0-100>,
    "vibe": <0-100>
  }
}

Score guide (MATCH roast tone to score range):
- D grade 0-20: brutal savage roast
- C grade 21-40: harsh criticism
- B grade 41-60: mild criticism, some positives
- A grade 61-80: mostly positive with one critique
- S grade 81-99: backhanded compliment or genuine praise
- S+ grade 100: pure admiration

Roast MUST match score: high scores (81+) should NOT say "패션 테러리스트". Low scores (0-40) should be savage.
Provide 1-3 improvement items only for the most offensive pieces. If outfit is great (80+), give 0-1 improvements.
Gender-appropriate searchQuery:
- 여성: "와이드 데님 팬츠 여성", "크롭 니트 여성", "메리제인 플랫슈즈 여성"
- 남성: "슬림 슬랙스 남성", "오버핏 셔츠 남성", "첼시부츠 남성"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { imageBase64, situation } = req.body as { imageBase64: string; situation?: string }

  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' })

  try {
    const output = await replicate.run('meta/llama-3.2-11b-vision-instruct', {
      input: {
        image: imageBase64,
        prompt: PROMPT(situation),
        max_tokens: 600,
        temperature: 0.7,
      },
    }) as string[]

    const raw = output.join('').trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0])
    const score = Math.max(0, Math.min(100, Math.round(parsed.score)))

    res.json({
      score,
      tier: scoreToTier(score),
      roast: parsed.roast ?? '패션 분석 실패... 그것조차 패션 테러',
      improvements: (parsed.improvements ?? []).slice(0, 3),
      stats: {
        coordination: parsed.stats?.coordination ?? score,
        color:        parsed.stats?.color ?? score,
        fit:          parsed.stats?.fit ?? score,
        trend:        parsed.stats?.trend ?? score,
        vibe:         parsed.stats?.vibe ?? score,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Analysis failed', detail: String(err) })
  }
}
