import { AUTO_INDICES, NEUTRAL_INDICES, PALETTE } from "./palette";

/** sRGB(0~255) → CIE Lab (D65) */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const f = (c: number) => {
    c /= 255;
    return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
  };
  const R = f(r), G = f(g), B = f(b);
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const h = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = h(x); y = h(y); z = h(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const PLAB = PALETTE.map((c) => rgbToLab(...c.rgb));

/** 자동 배색 36색 중 Lab 거리가 가장 가까운 색의 PALETTE 인덱스. 회색조 픽셀은 무채색에서만 고른다. */
export function nearestColor(r: number, g: number, b: number): number {
  const L = rgbToLab(r, g, b);
  const gray = Math.max(r, g, b) - Math.min(r, g, b) < 42;
  let best = AUTO_INDICES[0], bestD = Infinity;
  for (const i of AUTO_INDICES) {
    if (gray && !NEUTRAL_INDICES.has(i)) continue;
    const p = PLAB[i];
    const d = (p[0] - L[0]) ** 2 + (p[1] - L[1]) ** 2 + (p[2] - L[2]) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}
