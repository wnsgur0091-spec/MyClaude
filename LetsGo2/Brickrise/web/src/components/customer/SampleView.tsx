"use client";
import { BrickCanvas } from "@/components/BrickCanvas";
import { emptyModel, setCell, type BrickModel } from "@/shared/model";

/** 첫 화면 예시: 작은 브릭 집 모양 (실제 생성 결과 아님) */
function sampleHouse(): BrickModel {
  const m = emptyModel(7, 7, 5);
  const wall = 10, roof = 24, door = 19, win = 6; // PALETTE 인덱스: 11 베이지색 · 25 빨강색 · 20 진갈색 · 07 연파랑색
  for (let y = 0; y < 4; y++) for (let x = 0; x < 7; x++) for (let z = 0; z < 5; z++) setCell(m, x, y, z, wall);
  for (let k = 0; k < 3; k++) for (let x = k; x < 7 - k; x++) for (let z = 0; z < 5; z++) setCell(m, x, 4 + k, z, roof);
  setCell(m, 3, 0, 4, door); setCell(m, 3, 1, 4, door);
  setCell(m, 1, 2, 4, win); setCell(m, 5, 2, 4, win); setCell(m, 6, 2, 2, win);
  return m;
}
const SAMPLE = sampleHouse();

export function SampleView() {
  return <BrickCanvas model={SAMPLE} flat={false} width={400} height={260} label="브릭 집 완성 예시" />;
}
