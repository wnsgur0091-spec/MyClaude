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

Return ONLY valid JSON (no markdown, no explanation):
{
  "score": <integer 0-100>,
  "roast": "<Korean savage roast, max 35 chars, be funny & cutting>",
  "improvements": [
    {
      "item": "<clothing item in Korean e.g. 상의/하의/신발/가방/액세서리>",
      "comment": "<what's wrong, Korean, max 20 chars>",
      "searchQuery": "<Korean search keyword for a better replacement>"
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

Score guide: 0-15=iron, 16-30=bronze, 31-50=silver, 51-70=gold, 71-85=platinum, 86-93=diamond, 94-100=challenger
Roast style: sarcastic, slightly mean, funny. E.g. "이 조합은 진짜 눈 테러", "패션 테러리스트 등극 🎖", "다음엔 눈 감고 입어봐"
Provide 1-3 improvement items only for the most offensive pieces. If outfit is great, give 0-1 improvements.`

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
