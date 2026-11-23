"use client";
import { useEffect, useRef } from "react";
import { getCell, rotateModel, type BrickModel } from "@/shared/model";
import { rgbCss } from "@/shared/palette";

/** 브릭 모델 미리보기: 평면은 정면 격자, 입체는 등각 투영 (docs/demo.html의 drawFlat / drawIso) */
export function BrickCanvas({ model, flat, rot = 0, width = 400, height = 300, label }: {
  model: BrickModel; flat: boolean; rot?: number; width?: number; height?: number; label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    if (flat && model.Y === 1) drawFlat(cv, model, width, height);
    else drawIso(cv, rotateModel(model, rot), width, height);
  }, [model, flat, rot, width, height]);
  return <canvas ref={ref} role="img" aria-label={label ?? "브릭 시안 미리보기"} />;
}

function prep(cv: HTMLCanvasElement, w: number, h: number) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = w * dpr; cv.height = h * dpr;
  const c = cv.getContext("2d")!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  return c;
}

function drawFlat(cv: HTMLCanvasElement, m: BrickModel, W: number, maxH: number) {
  const cols = m.X, rows = m.Z, s = Math.min((W - 24) / cols, (maxH - 24) / rows);
  const H = Math.ceil(rows * s + 24), c = prep(cv, W, H), ox = (W - cols * s) / 2, oy = 12;
  for (let r = 0; r < rows; r++)
    for (let x = 0; x < cols; x++) {
      const v = getCell(m, x, 0, r);
      if (v < 0) continue;
      const X0 = ox + x * s, Y0 = oy + r * s;
      c.fillStyle = rgbCss(v); c.fillRect(X0 + 0.5, Y0 + 0.5, s - 1, s - 1);
      c.beginPath(); c.arc(X0 + s / 2, Y0 + s / 2, s * 0.3, 0, Math.PI * 2);
      c.fillStyle = rgbCss(v, 1.08); c.fill(); c.strokeStyle = "rgba(0,0,0,.2)"; c.stroke();
    }
}

function drawIso(cv: HTMLCanvasElement, m: BrickModel, W: number, Hh: number) {
  const c = prep(cv, W, Hh), HR = 7 / 8;
  const raw = (x: number, y: number, z: number): [number, number] => [x - z, (x + z) * 0.5 - y * HR];
  const corners: Array<[number, number]> = [];
  for (const x of [0, m.X]) for (const y of [0, m.Y]) for (const z of [0, m.Z]) corners.push(raw(x, y, z));
  const xs = corners.map((p) => p[0]), ys = corners.map((p) => p[1]);
  const mnx = Math.min(...xs), mxx = Math.max(...xs), mny = Math.min(...ys), mxy = Math.max(...ys);
  const s = Math.min((W - 40) / (mxx - mnx || 1), (Hh - 40) / (mxy - mny || 1));
  const ox = (W - (mxx - mnx) * s) / 2 - mnx * s, oy = (Hh - (mxy - mny) * s) / 2 - mny * s;
  const P = (x: number, y: number, z: number): [number, number] => { const r = raw(x, y, z); return [r[0] * s + ox, r[1] * s + oy]; };
  const cells: Array<[number, number, number]> = [];
  for (let y = 0; y < m.Y; y++) for (let z = 0; z < m.Z; z++) for (let x = 0; x < m.X; x++) if (getCell(m, x, y, z) >= 0) cells.push([x, y, z]);
  cells.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  const poly = (pp: Array<[number, number]>, fill: string) => {
    c.beginPath(); c.moveTo(...pp[0]); for (const p of pp.slice(1)) c.lineTo(...p); c.closePath();
    c.fillStyle = fill; c.fill(); c.strokeStyle = "rgba(0,0,0,.22)"; c.lineWidth = 0.6; c.stroke();
  };
  for (const [x, y, z] of cells) {
    const v = getCell(m, x, y, z);
    const top = getCell(m, x, y + 1, z) < 0;
    if (top) poly([P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)], rgbCss(v, 1));
    if (getCell(m, x + 1, y, z) < 0) poly([P(x + 1, y, z), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x + 1, y + 1, z)], rgbCss(v, 0.8));
    if (getCell(m, x, y, z + 1) < 0) poly([P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)], rgbCss(v, 0.64));
    if (top && s > 9) {
      const [cx, cy] = P(x + 0.5, y + 1, z + 0.5);
      c.beginPath(); c.ellipse(cx, cy - s * 0.06, s * 0.42, s * 0.21, 0, 0, Math.PI * 2);
      c.fillStyle = rgbCss(v, 1.06); c.fill(); c.strokeStyle = "rgba(0,0,0,.18)"; c.stroke();
    }
  }
}
