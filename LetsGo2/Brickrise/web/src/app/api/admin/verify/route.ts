import { NextResponse, type NextRequest } from "next/server";
import { verifyOrder } from "@/server/orderCodes";
import { parseShape, parseSize } from "@/shared/options";

/** 결제 후 주문 검증 (운영자가 판매자센터의 주문 정보를 입력) */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const type = parseShape(b?.type), size = parseSize(b?.size);
  const qty = Number(b?.qty), amount = Number(b?.amount);
  if (!b || !type || !size || !Number.isInteger(qty) || qty < 0 || !Number.isInteger(amount) || amount < 0)
    return NextResponse.json({ error: "옵션, 수량, 금액을 확인해 주세요." }, { status: 400 });
  const v = await verifyOrder({
    code: String(b.code ?? ""), naverOrderNo: String(b.naverOrderNo ?? ""), type, size, qty, amount,
  });
  return NextResponse.json(v);
}
