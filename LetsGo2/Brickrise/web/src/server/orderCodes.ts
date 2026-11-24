import "server-only";
import { CODE_VALID_DAYS, formatCode, normalizeCode, parseCode } from "@/shared/orderCode";
import { optionLabel, type ShapeType, type SizeCm } from "@/shared/options";
import { calcPrice, PRICE_PER_10_BLOCKS, won } from "@/shared/pricing";
import { getStore, paymentTotal, type CheckResult, type OrderCode, type OrderVerification } from "./db";
import { newId, randomCodeChars } from "./ids";

/** 시안에 대한 주문 코드 발급. 같은 시안에 아직 유효한 코드가 있으면 그대로 돌려준다 */
export async function issueOrderCode(draftId: string, deviceId: string): Promise<OrderCode | null> {
  const store = getStore();
  const draft = await store.getDraft(draftId);
  if (!draft || draft.deviceId !== deviceId) return null;
  const now = new Date();
  const active = await store.findActiveCodeForDraft(draftId, now);
  if (active) return active;

  const p = calcPrice(draft.type, draft.size, draft.blockCount);
  for (let attempt = 0; attempt < 10; attempt++) {
    const oc: OrderCode = {
      code: formatCode(draft.type, draft.size, randomCodeChars(4)), draftId, type: draft.type, size: draft.size,
      blockCount: draft.blockCount, blockQty: p.blockQty, productTotal: p.productTotal, shippingFee: p.shipping,
      createdAt: now, expiresAt: new Date(now.getTime() + CODE_VALID_DAYS * 86400_000), usedAt: null, orderId: null,
    };
    if (await store.createOrderCode(oc)) return oc;
  }
  throw new Error("주문 코드 발급 실패 (중복이 계속됨)");
}

export type PaidInfo = { code: string; naverOrderNo: string; type: ShapeType; size: SizeCm; qty: number; amount: number };

/**
 * 결제 후 검증 4단계: 코드 존재·유효 / 옵션 = 코드의 형태·크기 / '블럭 10개' 수량 = ceil(블럭 수 / 10) / 금액.
 * 처음 걸린 단계에서 멈추고, 불일치 시 네이버 톡톡 안내 문구를 함께 돌려준다.
 */
export function runChecks(oc: OrderCode | null, paid: PaidInfo, now: Date): CheckResult[] {
  const out: CheckResult[] = [];
  const entered = normalizeCode(paid.code);

  if (!oc || !parseCode(entered)) {
    out.push({ key: "code", ok: false, title: "등록되지 않은 코드", message: `입력된 코드 '${entered || "(빈칸)"}'는 발급 기록에 없어요. 네이버 톡톡으로 고객에게 올바른 코드를 확인해 주세요.` });
    return out;
  }
  if (oc.usedAt) {
    out.push({ key: "code", ok: false, title: "이미 사용된 코드", message: `이 코드는 ${oc.usedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}에 이미 주문에 사용됐어요. 중복 주문인지 확인해 주세요.` });
    return out;
  }
  if (oc.expiresAt <= now) {
    out.push({ key: "code", ok: false, title: "만료된 코드", message: "발급 후 7일이 지난 코드예요. 네이버 톡톡으로 시안을 다시 만들어 새 코드로 주문해 달라고 안내해 주세요." });
    return out;
  }
  out.push({ key: "code", ok: true, title: "주문 코드 확인", message: "발급된 코드 · 7일 이내 · 처음 사용" });

  if (paid.type !== oc.type || paid.size !== oc.size) {
    out.push({ key: "opt", ok: false, title: "옵션 불일치", message: `결제한 옵션은 '${optionLabel(paid.type, paid.size)}'인데 코드는 '${optionLabel(oc.type, oc.size)}'예요. 네이버 톡톡으로 안내하고, 주문을 취소한 뒤 맞는 옵션으로 다시 결제받아 주세요.` });
    return out;
  }
  out.push({ key: "opt", ok: true, title: "옵션 일치", message: optionLabel(oc.type, oc.size) });

  if (paid.qty !== oc.blockQty) {
    const diff = Math.abs(paid.qty - oc.blockQty), amt = won(diff * PRICE_PER_10_BLOCKS);
    out.push(paid.qty < oc.blockQty
      ? { key: "qty", ok: false, title: "수량 부족", message: `'블럭 10개' 수량이 ${diff}개 모자라요 (결제 ${paid.qty} / 필요 ${oc.blockQty}). 네이버 톡톡으로 차액 ${amt} 추가 결제를 요청해 주세요.` }
      : { key: "qty", ok: false, title: "수량 초과", message: `'블럭 10개' 수량이 ${diff}개 더 결제됐어요 (결제 ${paid.qty} / 필요 ${oc.blockQty}). 초과분 ${amt}을 부분 환불해 주세요.` });
    return out;
  }
  out.push({ key: "qty", ok: true, title: "수량 일치", message: `블럭 10개 × ${oc.blockQty} (블럭 ${oc.blockCount}개)` });

  const expected = paymentTotal(oc);
  if (paid.amount !== expected) {
    out.push({ key: "amt", ok: false, title: "금액 불일치", message: `결제 금액 ${won(paid.amount)}이 시안 결제 금액 ${won(expected)}(배송비 ${won(oc.shippingFee)} 포함)과 달라요. 판매자센터의 옵션·추가상품·배송비 설정을 확인해 주세요.` });
    return out;
  }
  out.push({ key: "amt", ok: true, title: "금액 확인", message: `${won(expected)} (상품 ${won(oc.productTotal)} + 배송비 ${won(oc.shippingFee)})` });
  return out;
}

export async function verifyOrder(paid: PaidInfo): Promise<OrderVerification> {
  const store = getStore();
  const code = normalizeCode(paid.code);
  const oc = parseCode(code) ? await store.getOrderCode(code) : null;
  const now = new Date();
  const checks = runChecks(oc, paid, now);
  let passed = checks.length === 4 && checks.every((c) => c.ok);
  const id = newId();
  if (passed && !(await store.markCodeUsed(code, id, now))) {
    // 동시에 다른 검증이 먼저 코드를 쓴 경우
    passed = false;
    checks.splice(0, checks.length, { key: "code", ok: false, title: "이미 사용된 코드", message: "방금 다른 주문 검증에서 이 코드가 사용됐어요." });
  }
  const v: OrderVerification = {
    id, code, naverOrderNo: paid.naverOrderNo.trim(), paidType: paid.type, paidSize: paid.size,
    paidQty: paid.qty, paidAmount: paid.amount, passed, checks, createdAt: now,
  };
  await store.saveVerification(v);
  return v;
}
