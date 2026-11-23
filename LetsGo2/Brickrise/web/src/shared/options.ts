export type ShapeType = "flat" | "solid";
export type SizeCm = 5 | 10 | 15;

export const SHAPES: readonly ShapeType[] = ["flat", "solid"];
export const SIZES: readonly SizeCm[] = [5, 10, 15];

/** 크기(가로 기준) → 가로 칸 수. 블럭 한 칸 = 8mm */
export const CELLS: Record<SizeCm, number> = { 5: 6, 10: 12, 15: 18 };

export const shapeLabel = (t: ShapeType) => (t === "flat" ? "평면" : "입체");
export const optionLabel = (t: ShapeType, s: SizeCm) => `${shapeLabel(t)} ${s}cm`;

export function parseShape(v: unknown): ShapeType | null {
  return v === "flat" || v === "solid" ? v : null;
}
export function parseSize(v: unknown): SizeCm | null {
  const n = Number(v);
  return n === 5 || n === 10 || n === 15 ? n : null;
}
