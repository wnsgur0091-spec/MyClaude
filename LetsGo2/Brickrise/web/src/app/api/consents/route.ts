import { NextResponse, type NextRequest } from "next/server";
import { getStore } from "@/server/db";
import { newId } from "@/server/ids";
import { getDeviceId, ipHash, setDeviceCookie } from "@/server/request";
import { CONSENT_ITEMS, requiredAllAgreed, TERMS_VERSION, type ConsentAnswers } from "@/shared/consent";

/** 사진 받기 전 동의 기록 (약관 버전·시각 포함, 삭제하지 않음) */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !requiredAllAgreed(body)) return NextResponse.json({ error: "필수 항목에 모두 동의해 주세요." }, { status: 400 });
  const answers = Object.fromEntries(CONSENT_ITEMS.map((c) => [c.key, body[c.key] === true])) as ConsentAnswers;
  const { deviceId, isNew } = getDeviceId(req);
  await getStore().saveConsent({ id: newId(), deviceId, termsVersion: TERMS_VERSION, answers, ipHash: ipHash(req), createdAt: new Date() });
  const res = NextResponse.json({ ok: true, termsVersion: TERMS_VERSION });
  if (isNew) setDeviceCookie(res, deviceId);
  return res;
}
