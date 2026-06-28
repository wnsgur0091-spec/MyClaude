import { FashionResult, TIER_CONFIG } from '../types/fashion'

// 공유 카드 해상도 — 540×960 (9:16, 모바일 최적)
const CARD_W = 540
const CARD_H = 960

export async function generateShareCard(imageUrl: string, result: FashionResult): Promise<string> {
  const img = await loadImage(imageUrl)

  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')!
  const cfg = TIER_CONFIG[result.tier]

  // glow 색에서 알파만 교체: rgba(r,g,b,x) → rgba(r,g,b,0.35)
  const glowBg = cfg.glow.replace(/[\d.]+\)$/, '0.35)')

  // ── 1) 배경 ──────────────────────────────────────────────
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  const bgGlow = ctx.createRadialGradient(CARD_W / 2, 0, 0, CARD_W / 2, 0, CARD_W)
  bgGlow.addColorStop(0, glowBg)
  bgGlow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = bgGlow
  ctx.fillRect(0, 0, CARD_W, CARD_H * 0.5)

  // ── 2) 사진 + 하단 페이드 (한 번의 clip 안에서) ─────────
  const PX = CARD_W * 0.06, PY = CARD_H * 0.055
  const PW = CARD_W * 0.88, PH = CARD_H * 0.58
  const PR = 24

  ctx.save()
  roundedRect(ctx, PX, PY, PW, PH, PR)
  ctx.clip()

  // object-fit: cover
  const ia = img.width / img.height, fa = PW / PH
  let dw = PW, dh = PH, dx = PX, dy = PY
  if (ia > fa) { dw = PH * ia; dx = PX - (dw - PW) / 2 }
  else          { dh = PW / ia; dy = PY - (dh - PH) / 2 }
  ctx.drawImage(img, dx, dy, dw, dh)

  // 하단 그라디언트 — clip 안쪽이라 프레임 밖으로 안 넘침
  const fade = ctx.createLinearGradient(0, PY + PH * 0.55, 0, PY + PH)
  fade.addColorStop(0, 'rgba(0,0,0,0)')
  fade.addColorStop(1, 'rgba(0,0,0,0.72)')
  ctx.fillStyle = fade
  ctx.fillRect(PX, PY + PH * 0.55, PW, PH * 0.45)

  ctx.restore()

  // ── 3) 반짝이 효과 ───────────────────────────────────────
  const sparkles: [number, number, number][] = [
    [PX + PW * 0.1,  PY + PH * 0.12, 9],
    [PX + PW * 0.88, PY + PH * 0.08, 6],
    [PX + PW * 0.05, PY + PH * 0.45, 4],
    [PX + PW * 0.93, PY + PH * 0.38, 7],
    [PX + PW * 0.15, PY + PH * 0.78, 5],
    [PX + PW * 0.82, PY + PH * 0.72, 9],
    [PX + PW * 0.5,  PY + PH * 0.05, 6],
    [PX + PW * 0.3,  PY + PH * 0.9,  4],
    [PX + PW * 0.7,  PY + PH * 0.88, 7],
  ]
  for (const [sx, sy, sz] of sparkles) drawSparkle(ctx, sx, sy, sz, cfg.color)

  // ── 4) 티어 배지 (사진 좌상단) ──────────────────────────
  const BX = PX + 10, BY = PY + 10
  drawPill(ctx, BX, BY, 110, 33, 'rgba(0,0,0,0.75)', cfg.color)
  ctx.font = `bold 17px -apple-system, "Noto Sans KR", sans-serif`
  ctx.fillStyle = cfg.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${cfg.emoji} ${cfg.label}`, BX + 55, BY + 16)

  // ── 5) 점수 배지 (사진 우상단) ──────────────────────────
  const SX = PX + PW - 80
  drawPill(ctx, SX, BY, 70, 33, 'rgba(0,0,0,0.75)', cfg.color)
  ctx.font = `900 20px -apple-system, sans-serif`
  ctx.fillStyle = cfg.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${result.score}`, SX + 35, BY + 13)
  ctx.font = `500 10px -apple-system, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillText('/100', SX + 35, BY + 25)

  // ── 6) 한줄평 ────────────────────────────────────────────
  const RY = PY + PH + CARD_H * 0.028

  ctx.font = `600 16px -apple-system, "Noto Sans KR", sans-serif`
  ctx.fillStyle = cfg.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('👑 패션왕의 한줄평', CARD_W / 2, RY)

  ctx.font = `bold 23px -apple-system, "Noto Sans KR", sans-serif`
  ctx.fillStyle = '#ffffff'
  wrapText(ctx, `"${result.roast}"`, CARD_W / 2, RY + 27, CARD_W * 0.82, 30)

  // ── 7) 구분선 ────────────────────────────────────────────
  const LY = CARD_H * 0.88
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(CARD_W * 0.1, LY)
  ctx.lineTo(CARD_W * 0.9, LY)
  ctx.stroke()

  // ── 8) 브랜딩 ────────────────────────────────────────────
  ctx.font = `bold 18px -apple-system, "Noto Sans KR", sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('✦ FashionCheck  #패션체크 #오늘의코디', CARD_W / 2, CARD_H * 0.94)

  return canvas.toDataURL('image/jpeg', 0.88)
}

// ── 이미지 로드 (Promise 래퍼) ────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // blob: / data: URL은 crossOrigin 불필요 (설정 시 오류 가능)
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload  = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// ── Canvas 유틸 ──────────────────────────────────────────────

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y,     x + w, y + h, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x,     y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x,     y + h, x,     y,     r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x,     y,     x + w, y,     r)
  ctx.closePath()
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  bg: string, borderColor: string,
) {
  ctx.save()
  roundedRect(ctx, x, y, w, h, h / 2)
  ctx.fillStyle = bg
  ctx.fill()
  ctx.strokeStyle = borderColor
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, color: string,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = color
  ctx.globalAlpha = 0.75
  for (let i = 0; i < 4; i++) {
    ctx.save()
    ctx.rotate((i * Math.PI) / 2)
    ctx.beginPath()
    ctx.moveTo(0, -size)
    ctx.lineTo(size * 0.18, -size * 0.18)
    ctx.lineTo(size, 0)
    ctx.lineTo(size * 0.18, size * 0.18)
    ctx.lineTo(0, size)
    ctx.lineTo(-size * 0.18, size * 0.18)
    ctx.lineTo(-size, 0)
    ctx.lineTo(-size * 0.18, -size * 0.18)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string, cx: number, y: number,
  maxW: number, lineH: number,
) {
  let ty = y
  let currentLine = ''
  for (const ch of Array.from(text)) {
    const test = currentLine + ch
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(currentLine, cx, ty)
      currentLine = ch
      ty += lineH
    } else {
      currentLine = test
    }
  }
  if (currentLine) ctx.fillText(currentLine, cx, ty)
}
