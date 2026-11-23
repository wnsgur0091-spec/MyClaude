import { NextResponse, type NextRequest } from "next/server";
import { getStore } from "@/server/db";
import { todayKst } from "@/server/ids";
import { getQuota } from "@/server/quota";
import { config } from "@/server/config";
import { getDeviceId, ipHash, setDeviceCookie } from "@/server/request";
import { TERMS_VERSION } from "@/shared/consent";

export const dynamic = "force-dynamic";

/** 고객 화면 시작 시: 기기 쿠키 발급, 동의 여부, 오늘 남은 무료 횟수 */
export async function GET(req: NextRequest) {
  const { deviceId, isNew } = getDeviceId(req);
  const store = getStore();
  const consent = isNew ? null : await store.getLatestConsent(deviceId);
  const q = await getQuota(store, deviceId, ipHash(req), todayKst());
  const res = NextResponse.json({
    consented: !!consent && consent.termsVersion === TERMS_VERSION,
    remaining: q.remaining,
    perDay: config.quota.perDevicePerDay,
  });
  if (isNew) setDeviceCookie(res, deviceId);
  return res;
}
