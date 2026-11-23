import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_SESSION_HOURS, adminPassword, createAdminToken, sessionSecret, timingSafeEqual } from "@/server/auth";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const pw = adminPassword(), secret = sessionSecret();
  if (!pw || !secret) return NextResponse.json({ error: "ADMIN_PASSWORD와 SESSION_SECRET 환경변수를 설정해 주세요." }, { status: 503 });
  if (typeof body?.password !== "string" || !timingSafeEqual(body.password, pw))
    return NextResponse.json({ error: "비밀번호가 맞지 않아요." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createAdminToken(secret), {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: ADMIN_SESSION_HOURS * 3600,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
