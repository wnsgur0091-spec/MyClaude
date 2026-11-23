import { describe, expect, it } from "vitest";
import { formatCode, parseCode, CODE_CHARS } from "./orderCode";
import { calcPrice } from "./pricing";
import { AUTO_INDICES, PALETTE } from "./palette";
import { nearestColor } from "./color";
import { colorCounts, countBlocks, emptyModel, rotateModel, setCell } from "./model";

describe("주문 코드", () => {
  it("형식 BR-3D10-XXXX를 만들고 다시 읽는다", () => {
    expect(formatCode("solid", 10, "K7Q2")).toBe("BR-3D10-K7Q2");
    expect(formatCode("flat", 5, "ABCD")).toBe("BR-2D05-ABCD");
    expect(parseCode(" br-2d15-abcd ")).toEqual({ code: "BR-2D15-ABCD", type: "flat", size: 15 });
  });
  it("헷갈리는 문자(I, O, 0, 1)와 잘못된 크기는 거부", () => {
    expect(CODE_CHARS).not.toMatch(/[IO01]/);
    expect(parseCode("BR-3D10-K0Q2")).toBeNull();
    expect(parseCode("BR-3D12-K7Q2")).toBeNull();
    expect(parseCode("BR-4D10-K7Q2")).toBeNull();
  });
});

describe("가격", () => {
  it("기본 제작비 + ceil(블럭 수 / 10) × 100원", () => {
    expect(calcPrice("solid", 10, 298)).toEqual({ base: 16900, blockCount: 298, blockQty: 30, blocks: 3000, total: 19900 });
    expect(calcPrice("flat", 5, 30).blockQty).toBe(3);
  });
});

describe("팔레트", () => {
  it("39색, 자동 배색은 투명·야광 3색을 뺀 36색", () => {
    expect(PALETTE).toHaveLength(39);
    expect(AUTO_INDICES).toHaveLength(36);
    expect(AUTO_INDICES.map((i) => PALETTE[i].no)).not.toContain("33");
  });
  it("가장 가까운 색: 순색은 같은 이름, 회색조는 무채색만", () => {
    expect(PALETTE[nearestColor(232, 38, 43)].name).toBe("빨강색");
    expect(PALETTE[nearestColor(14, 102, 197)].name).toBe("파랑색");
    expect(["흰색", "회색", "진회색", "검정색"]).toContain(PALETTE[nearestColor(200, 205, 200)].name);
    // 투명색(213,211,217)과 거의 같은 색이어도 자동 배색에서는 고르지 않음
    expect(PALETTE[nearestColor(213, 211, 217)].no).not.toBe("33");
  });
});

describe("모델", () => {
  it("블럭 수·색상별 개수·회전", () => {
    const m = emptyModel(3, 1, 2);
    setCell(m, 0, 0, 0, 5); setCell(m, 1, 0, 0, 5); setCell(m, 2, 0, 1, 7);
    expect(countBlocks(m)).toBe(3);
    expect(colorCounts(m)).toEqual([{ color: 5, count: 2 }, { color: 7, count: 1 }]);
    const r = rotateModel(m, 1);
    expect([r.X, r.Y, r.Z]).toEqual([2, 1, 3]);
    expect(countBlocks(r)).toBe(3);
    expect(rotateModel(m, 4)).toEqual(m);
  });
});
