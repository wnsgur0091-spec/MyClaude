/**
 * 관리자 세션: 비밀번호 로그인 후 서명된 쿠키 (만료시각.HMAC).
 * 미들웨어(Edge)에서도 돌아가도록 Web Crypto만 쓴다.
 */
export const ADMIN_COOKIE = "br_admin";
export const ADMIN_SESSION_HOURS = 12;

const enc = new TextEncoder();

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createAdminToken(secret: string, now = Date.now()): Promise<string> {
  const exp = String(now + ADMIN_SESSION_HOURS * 3600_000);
  return `${exp}.${await hmac(secret, `admin|${exp}`)}`;
}

export async function verifyAdminToken(secret: string, token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!secret || !token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !(Number(exp) > now)) return false;
  return timingSafeEqual(sig, await hmac(secret, `admin|${exp}`));
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** 미들웨어·서버 공용: 환경변수에서 비밀값 읽기 (운영에서는 기본값 없음) */
export function sessionSecret(): string {
  return process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-only-session-secret");
}
export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "admin");
}
