import type { ShapeType, SizeCm } from "./options";
import { parseSize } from "./options";

/** 헷갈리는 문자(I, O, 0, 1) 제외 */
export const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_VALID_DAYS = 7;

/** 형식: BR-3D10-K7Q2 (3D=입체, 2D=평면 / 05·10·15=크기 / 무작위 4자리) */
const CODE_RE = new RegExp(`^BR-(2D|3D)(05|10|15)-([${CODE_CHARS}]{4})$`);

export function formatCode(type: ShapeType, size: SizeCm, random4: string) {
  return `BR-${type === "solid" ? "3D" : "2D"}${String(size).padStart(2, "0")}-${random4}`;
}

export function parseCode(raw: string): { code: string; type: ShapeType; size: SizeCm } | null {
  const code = normalizeCode(raw);
  const m = CODE_RE.exec(code);
  if (!m) return null;
  const size = parseSize(m[2]);
  if (!size) return null;
  return { code, type: m[1] === "3D" ? "solid" : "flat", size };
}

export const normalizeCode = (raw: string) => String(raw ?? "").trim().toUpperCase();
