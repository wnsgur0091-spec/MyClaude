import { nearestColor } from "@/shared/color";

/** RGBA 픽셀 (width × height × 4) */
export type RgbaImage = { width: number; height: number; data: Uint8Array | Buffer };

export type GridAnalysis = {
  cols: number;
  rows: number;
  /** 칸별 PALETTE 인덱스, 배경은 -1 (행 우선, 위에서 아래) */
  idx: number[];
  /** 피사체(배경 아닌 픽셀)가 차지하는 비율 */
  subjectRatio: number;
  /** 피사체 평균 밝기 0~255 */
  meanLum: number;
};

/**
 * 사진 → 칸 격자 배색 (docs/demo.html의 analyze를 옮긴 것).
 * 1) 투명 배경이 없으면 테두리 색(중앙값)과 비슷한 영역을 바깥에서부터 채워 배경으로 본다
 * 2) 칸마다 피사체 픽셀이 40% 넘으면 평균색, 아니면 빈칸
 * 3) 밝기 상위 5%가 225가 되도록 밝기 보정 후 36색 중 가장 가까운 색
 */
export function analyzeGrid(img: RgbaImage, cols: number): GridAnalysis {
  const { width: W, height: H, data: d } = img;
  const bg = new Uint8Array(W * H);
  let transp = 0;
  for (let i = 0; i < W * H; i++) if (d[i * 4 + 3] < 128) { bg[i] = 1; transp++; }

  if (transp < W * H * 0.02) {
    const border: number[] = [];
    for (let x = 0; x < W; x++) border.push(x, (H - 1) * W + x);
    for (let y = 0; y < H; y++) border.push(y * W, y * W + W - 1);
    const median = (k: number) => border.map((i) => d[i * 4 + k]).sort((a, b) => a - b)[border.length >> 1];
    const mr = median(0), mg = median(1), mb = median(2);
    const near = (i: number) => Math.abs(d[i * 4] - mr) + Math.abs(d[i * 4 + 1] - mg) + Math.abs(d[i * 4 + 2] - mb) < 30;
    const q: number[] = [];
    for (const i of border) if (!bg[i] && near(i)) { bg[i] = 1; q.push(i); }
    while (q.length) {
      const i = q.pop()!, x = i % W, y = (i / W) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1])
        if (j >= 0 && !bg[j] && near(j)) { bg[j] = 1; q.push(j); }
    }
    let b = 0;
    for (const v of bg) b += v;
    if (b < W * H * 0.05) bg.fill(0); // 배경이라 볼 만한 영역이 거의 없으면 사진 전체를 피사체로
  }

  let fg = 0, lum = 0;
  for (let i = 0; i < W * H; i++) if (!bg[i]) { fg++; lum += 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; }

  const rows = Math.max(1, Math.round((cols * H) / W));
  const cells: Array<[number, number, number] | null> = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      let n = 0, t = 0, R = 0, G = 0, B = 0;
      const x0 = Math.floor((c * W) / cols), x1 = Math.floor(((c + 1) * W) / cols);
      const y0 = Math.floor((r * H) / rows), y1 = Math.floor(((r + 1) * H) / rows);
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const i = y * W + x;
          t++;
          if (!bg[i]) { n++; R += d[i * 4]; G += d[i * 4 + 1]; B += d[i * 4 + 2]; }
        }
      cells.push(t > 0 && n > t * 0.4 ? [R / n, G / n, B / n] : null);
    }

  const ls = cells.filter((c): c is [number, number, number] => !!c).map((c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]).sort((a, b) => a - b);
  const p95 = ls.length ? ls[Math.floor(ls.length * 0.95)] : 255;
  const k = p95 < 225 ? 225 / Math.max(p95, 1) : 1;
  const idx = cells.map((c) => (c ? nearestColor(...(c.map((v) => Math.min(255, v * k)) as [number, number, number])) : -1));

  return { cols, rows, idx, subjectRatio: fg / (W * H), meanLum: fg ? lum / fg : 0 };
}

/** 흐림 정도: 회색조 이미지의 라플라시안 분산 (값이 작을수록 흐림) */
export function sharpness(gray: Uint8Array | Buffer, W: number, H: number): number {
  let sum = 0, sum2 = 0, n = 0;
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - W] - gray[i + W];
      sum += v; sum2 += v * v; n++;
    }
  if (!n) return 0;
  const mean = sum / n;
  return sum2 / n - mean * mean;
}
