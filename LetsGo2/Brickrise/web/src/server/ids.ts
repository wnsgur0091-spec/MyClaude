import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { CODE_CHARS } from "@/shared/orderCode";

export const newId = () => randomUUID();

/** 서울 기준 날짜 (YYYY-MM-DD): 하루 무료 횟수의 기준일 */
export function todayKst(now = new Date()): string {
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

export const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");

export function randomCodeChars(n: number): string {
  // 32글자라 바이트 % 32에 치우침 없음
  const bytes = randomBytes(n);
  let s = "";
  for (const b of bytes) s += CODE_CHARS[b % CODE_CHARS.length];
  return s;
}
