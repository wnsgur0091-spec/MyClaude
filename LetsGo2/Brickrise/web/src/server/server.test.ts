import { describe, expect, it } from "vitest";
import { analyzeGrid, sharpness } from "./generation/analyze";
import { checkQuality } from "./generation/quality";
import { flatModel } from "./generation/flat";
import { mockSolidGenerator } from "./generation/solid";
import { runChecks } from "./orderCodes";
import { MemoryStore } from "./db/memory";
import { createAdminToken, verifyAdminToken } from "./auth";
import { countBlocks } from "@/shared/model";
import { PALETTE } from "@/shared/palette";
import type { OrderCode } from "./db/types";

/** 흰 배경 가운데에 빨간 사각형이 있는 사진 */
function redSquare(W = 120, H = 120, inset = 30) {
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, inside = x >= inset && x < W - inset && y >= inset && y < H - inset;
      data.set(inside ? [232, 38, 43, 255] : [250, 250, 250, 255], i);
    }
  return { width: W, height: H, data };
}

describe("평면 배색", () => {
  it("테두리 색을 배경으로 빼고 피사체만 칸으로", () => {
    const a = analyzeGrid(redSquare(), 12);
    expect(a.cols).toBe(12);
    expect(a.rows).toBe(12);
    const filled = a.idx.filter((c) => c >= 0);
    expect(filled.length).toBe(36); // 가운데 6×6칸
    // 단색 피사체는 밝기 보정(상위 5% 밝기를 225로)으로 한 톤 밝아진다 (docs/demo.html과 같은 동작)
    expect(new Set(filled.map((c) => PALETTE[c].name)).size).toBe(1);
    expect(a.subjectRatio).toBeCloseTo(0.25, 2);
    const m = flatModel(a);
    expect([m.X, m.Y, m.Z]).toEqual([12, 1, 12]);
    expect(countBlocks(m)).toBe(36);
  });
  it("밝은 부분이 있는 피사체는 원래 색을 유지", () => {
    const img = redSquare();
    // 피사체 아래쪽 1/3을 흰색 줄무늬로 (밝은 영역이 있으면 밝기 보정이 거의 없음)
    for (let y = 70; y < 90; y++) for (let x = 30; x < 90; x++) img.data.set([240, 240, 236, 255], (y * 120 + x) * 4);
    const a = analyzeGrid(img, 12);
    const names = a.idx.filter((c) => c >= 0).map((c) => PALETTE[c].name);
    expect(names).toContain("빨강색");
    expect(names).toContain("흰색");
  });
  it("투명 배경 PNG는 알파로 배경 판단", () => {
    const img = redSquare();
    for (let i = 0; i < img.width * img.height; i++) if (img.data[i * 4] === 250) img.data[i * 4 + 3] = 0;
    // 6칸 격자에서 피사체는 가운데 4×4칸 걸침, 모서리 4칸은 40% 미만이라 빔
    expect(analyzeGrid(img, 6).idx.filter((c) => c >= 0).length).toBe(12);
  });
  it("입체 임시 생성기는 실루엣을 부풀린다", async () => {
    const a = analyzeGrid(redSquare(), 12);
    const m = await mockSolidGenerator.generate({ photo: Buffer.alloc(0), mimeType: "image/png", size: 10, cols: 12, analysis: a });
    expect(m.Y).toBe(12);
    expect(countBlocks(m)).toBeGreaterThan(36);
  });
});

describe("품질 검사", () => {
  const limits = { minWidth: 200, minMeanLum: 40, minSubjectRatio: 0.06, minSharpness: 6 };
  const ok = { subjectRatio: 0.3, meanLum: 120, cols: 1, rows: 1, idx: [] };
  it("해상도 → 밝기 → 흐림 → 피사체 크기 순서", () => {
    expect(checkQuality({ width: 100, sharpness: 100, analysis: ok }, limits)).toBe("resolution");
    expect(checkQuality({ width: 800, sharpness: 100, analysis: { ...ok, meanLum: 20 } }, limits)).toBe("dark");
    expect(checkQuality({ width: 800, sharpness: 1, analysis: ok }, limits)).toBe("blurry");
    expect(checkQuality({ width: 800, sharpness: 100, analysis: { ...ok, subjectRatio: 0.01 } }, limits)).toBe("small_subject");
    expect(checkQuality({ width: 800, sharpness: 100, analysis: ok }, limits)).toBeNull();
  });
  it("선명도: 평평한 이미지는 0, 경계가 있으면 큼", () => {
    expect(sharpness(new Uint8Array(100).fill(128), 10, 10)).toBe(0);
    const g = new Uint8Array(100);
    for (let i = 0; i < 100; i++) g[i] = (i % 10) < 5 ? 0 : 255;
    expect(sharpness(g, 10, 10)).toBeGreaterThan(1000);
  });
});

describe("주문 검증 4단계", () => {
  const now = new Date("2026-11-23T00:00:00Z");
  const oc: OrderCode = {
    code: "BR-3D10-K7Q2", draftId: "d", type: "solid", size: 10, blockCount: 298, blockQty: 30, productTotal: 19900, shippingFee: 3000,
    createdAt: now, expiresAt: new Date(now.getTime() + 7 * 86400_000), usedAt: null, orderId: null,
  };
  const paid = { code: "br-3d10-k7q2", naverOrderNo: "1", type: "solid" as const, size: 10 as const, qty: 30, amount: 22900 };
  const keys = (r: ReturnType<typeof runChecks>) => r.map((c) => `${c.key}:${c.ok ? "ok" : c.title}`);

  it("모두 맞으면 4단계 통과", () => {
    expect(keys(runChecks(oc, paid, now))).toEqual(["code:ok", "opt:ok", "qty:ok", "amt:ok"]);
  });
  it("없는·사용된·만료된 코드", () => {
    expect(keys(runChecks(null, paid, now))).toEqual(["code:등록되지 않은 코드"]);
    expect(keys(runChecks({ ...oc, usedAt: now }, paid, now))).toEqual(["code:이미 사용된 코드"]);
    expect(keys(runChecks(oc, paid, new Date(now.getTime() + 8 * 86400_000)))).toEqual(["code:만료된 코드"]);
  });
  it("옵션 불일치 / 수량 부족·초과 / 금액 불일치", () => {
    expect(keys(runChecks(oc, { ...paid, type: "flat" }, now)).at(-1)).toBe("opt:옵션 불일치");
    expect(keys(runChecks(oc, { ...paid, qty: 28 }, now)).at(-1)).toBe("qty:수량 부족");
    expect(runChecks(oc, { ...paid, qty: 28 }, now).at(-1)!.message).toContain("200원");
    expect(keys(runChecks(oc, { ...paid, qty: 31 }, now)).at(-1)).toBe("qty:수량 초과");
    expect(keys(runChecks(oc, { ...paid, amount: 19900 }, now)).at(-1)).toBe("amt:금액 불일치"); // 배송비 빠진 금액
  });
});

describe("메모리 저장소", () => {
  it("코드는 한 번만 사용 처리", async () => {
    const s = new MemoryStore();
    const now = new Date();
    const oc: OrderCode = { code: "BR-2D05-AAAA", draftId: "d", type: "flat", size: 5, blockCount: 1, blockQty: 1, productTotal: 1, shippingFee: 0, createdAt: now, expiresAt: now, usedAt: null, orderId: null };
    expect(await s.createOrderCode(oc)).toBe(true);
    expect(await s.createOrderCode({ ...oc })).toBe(false);
    expect(await s.markCodeUsed(oc.code, "o1", now)).toBe(true);
    expect(await s.markCodeUsed(oc.code, "o2", now)).toBe(false);
  });
  it("무료 횟수 카운터는 날짜별", async () => {
    const s = new MemoryStore();
    await s.incrementQuota(["d:x", "i:y"], "2026-11-23");
    await s.incrementQuota(["d:x", "i:y"], "2026-11-23");
    expect(await s.getQuotaCounts(["d:x", "i:y"], "2026-11-23")).toEqual({ "d:x": 2, "i:y": 2 });
    expect(await s.getQuotaCounts(["d:x"], "2026-11-24")).toEqual({ "d:x": 0 });
  });
});

describe("관리자 토큰", () => {
  it("서명·만료 확인", async () => {
    const t = await createAdminToken("s", 1000);
    expect(await verifyAdminToken("s", t, 2000)).toBe(true);
    expect(await verifyAdminToken("other", t, 2000)).toBe(false);
    expect(await verifyAdminToken("s", t, 1000 + 13 * 3600_000)).toBe(false);
    expect(await verifyAdminToken("s", t.replace(/.$/, "0"), 2000)).toBe(t.endsWith("0"));
    expect(await verifyAdminToken("", t, 2000)).toBe(false);
  });
});
