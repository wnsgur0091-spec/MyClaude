import { NextResponse, type NextRequest } from "next/server";
import { getStore, paymentTotal } from "@/server/db";
import { normalizeCode, parseCode } from "@/shared/orderCode";

/** 주문 검증 화면 자동 채우기: 주문 코드로 발급 정보 조회 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode(decodeURIComponent((await params).code));
  const store = getStore();
  const oc = parseCode(code) ? await store.getOrderCode(code) : null;
  if (!oc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // 검증을 통과해 사용 처리된 코드면 그때 입력한 네이버 주문번호
  const v = oc.orderId ? await store.getVerification(oc.orderId) : null;
  return NextResponse.json({
    code: oc.code, type: oc.type, size: oc.size, blockCount: oc.blockCount, blockQty: oc.blockQty,
    productTotal: oc.productTotal, shippingFee: oc.shippingFee, paymentTotal: paymentTotal(oc),
    expiresAt: oc.expiresAt.toISOString(), usedAt: oc.usedAt?.toISOString() ?? null, naverOrderNo: v?.naverOrderNo || null,
  });
}
