import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import { config } from "./config";
import { sessionSecret } from "./auth";
import { newId, sha256, todayKst } from "./ids";

export const DEVICE_COOKIE = "br_did";

/** 기기 표시 쿠키 (로그인 없음). 없으면 새로 만들고, 응답에 setDeviceCookie로 심는다 */
export function getDeviceId(req: NextRequest): { deviceId: string; isNew: boolean } {
  const v = req.cookies.get(DEVICE_COOKIE)?.value;
  if (v && /^[0-9a-f-]{36}$/.test(v)) return { deviceId: v, isNew: false };
  return { deviceId: newId(), isNew: true };
}

export function setDeviceCookie(res: NextResponse, deviceId: string) {
  res.cookies.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true, sameSite: "lax", secure: config.isProd, path: "/", maxAge: 60 * 60 * 24 * 365,
  });
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "0.0.0.0").trim();
}

/** IP는 원문을 저장하지 않고, 날짜가 섞인 해시로만 짧게 보관 (다른 날과 연결 불가) */
export function ipHash(req: NextRequest, day = todayKst()): string {
  return sha256(`${sessionSecret()}|${day}|${clientIp(req)}`).slice(0, 24);
}
