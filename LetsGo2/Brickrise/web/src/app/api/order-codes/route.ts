import { NextResponse, type NextRequest } from "next/server";
import { issueOrderCode } from "@/server/orderCodes";
import { getDeviceId } from "@/server/request";

/** 시안 확인 후 '이대로 주문' → 주문 코드 발급 (7일 유효, 1회용) */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { draftId?: unknown } | null;
  const { deviceId, isNew } = getDeviceId(req);
  if (isNew || typeof body?.draftId !== "string") return NextResponse.json({ error: "시안을 찾을 수 없어요." }, { status: 404 });
  const oc = await issueOrderCode(body.draftId, deviceId);
  if (!oc) return NextResponse.json({ error: "시안을 찾을 수 없어요." }, { status: 404 });
  return NextResponse.json({
    code: oc.code, type: oc.type, size: oc.size, blockCount: oc.blockCount, blockQty: oc.blockQty, total: oc.total,
    expiresAt: oc.expiresAt.toISOString(),
  });
}
