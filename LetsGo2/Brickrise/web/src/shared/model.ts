/**
 * 브릭 모델: X(가로) × Y(높이, 층) × Z(세로/깊이) 칸. 칸 값은 PALETTE 인덱스, 빈칸은 -1.
 * 평면은 Y = 1, X = 가로 칸, Z = 세로 줄 (위에서 아래).
 * 인덱스 = (y * Z + z) * X + x
 */
export type BrickModel = { X: number; Y: number; Z: number; cells: number[] };

export function emptyModel(X: number, Y: number, Z: number): BrickModel {
  return { X, Y, Z, cells: new Array(X * Y * Z).fill(-1) };
}
export const cellIndex = (m: BrickModel, x: number, y: number, z: number) => (y * m.Z + z) * m.X + x;
export function getCell(m: BrickModel, x: number, y: number, z: number): number {
  if (x < 0 || y < 0 || z < 0 || x >= m.X || y >= m.Y || z >= m.Z) return -1;
  return m.cells[cellIndex(m, x, y, z)];
}
export function setCell(m: BrickModel, x: number, y: number, z: number, c: number) {
  m.cells[cellIndex(m, x, y, z)] = c;
}
export const countBlocks = (m: BrickModel) => m.cells.reduce((n, c) => (c >= 0 ? n + 1 : n), 0);

/** 색상별 개수 (많은 순) */
export function colorCounts(m: BrickModel): Array<{ color: number; count: number }> {
  const o = new Map<number, number>();
  for (const c of m.cells) if (c >= 0) o.set(c, (o.get(c) ?? 0) + 1);
  return [...o.entries()].map(([color, count]) => ({ color, count })).sort((a, b) => b.count - a.count);
}

/** 실물 크기(mm): 가로·세로 8mm, 높이(층) 7mm */
export function sizeMm(m: BrickModel, flat: boolean) {
  return flat ? `${m.X * 8} × ${m.Z * 8}mm` : `${m.X * 8} × ${m.Z * 8} × ${m.Y * 7}mm`;
}

/** 수직축 기준 90° 회전 k번 (미리보기용) */
export function rotateModel(m: BrickModel, k: number): BrickModel {
  let cur = m;
  for (let t = 0; t < ((k % 4) + 4) % 4; t++) {
    const o = cur, n = emptyModel(o.Z, o.Y, o.X);
    for (let y = 0; y < o.Y; y++) for (let x = 0; x < n.X; x++) for (let z = 0; z < n.Z; z++) setCell(n, x, y, z, getCell(o, z, y, o.Z - 1 - x));
    cur = n;
  }
  return cur;
}
