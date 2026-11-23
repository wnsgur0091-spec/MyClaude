import type { ShapeType, SizeCm } from "./options";

/**
 * 가격 (임시 값: 판매가·단가 미확정, 시연 페이지와 같은 값).
 * 네이버 결제 구조와 맞춘다: 옵션(형태·크기) = 기본 제작비, 추가상품 '블럭 10개' 수량 = ceil(블럭 수 / 10).
 */
export const BASE_PRICE: Record<ShapeType, Record<SizeCm, number>> = {
  flat: { 5: 9500, 10: 11500, 15: 12900 },
  solid: { 5: 13900, 10: 16900, 15: 17900 },
};
/** 추가상품 '블럭 10개' 1개 가격 */
export const PRICE_PER_10_BLOCKS = 100;

export type Price = { base: number; blockCount: number; blockQty: number; blocks: number; total: number };

export function calcPrice(type: ShapeType, size: SizeCm, blockCount: number): Price {
  const base = BASE_PRICE[type][size];
  const blockQty = Math.ceil(blockCount / 10);
  const blocks = blockQty * PRICE_PER_10_BLOCKS;
  return { base, blockCount, blockQty, blocks, total: base + blocks };
}

export const won = (n: number) => n.toLocaleString("ko-KR") + "원";
