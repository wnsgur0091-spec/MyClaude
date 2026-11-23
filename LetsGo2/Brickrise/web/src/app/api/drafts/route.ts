import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/server/config";
import { createDraft } from "@/server/drafts";
import { getDeviceId, ipHash } from "@/server/request";
import { parseShape, parseSize } from "@/shared/options";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

/** 사진 1장 업로드 → 품질 검사 → 무료 횟수 확인 → 시안 생성 */
export async function POST(req: NextRequest) {
  const { deviceId, isNew } = getDeviceId(req);
  if (isNew) return NextResponse.json({ error: "no_consent", message: "사진을 올리기 전에 동의가 필요해요." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const photo = form?.get("photo");
  const type = parseShape(form?.get("type"));
  const size = parseSize(form?.get("size"));
  if (!type || !size) return NextResponse.json({ error: "bad_request", message: "형태와 크기를 골라 주세요." }, { status: 400 });
  if (!(photo instanceof File) || !ALLOWED.has(photo.type))
    return NextResponse.json({ error: "bad_image", message: "JPG, PNG, WEBP 사진만 올릴 수 있어요." }, { status: 400 });
  if (photo.size > config.maxUploadBytes)
    return NextResponse.json({ error: "bad_image", message: "사진 용량이 너무 커요." }, { status: 413 });

  const result = await createDraft({
    deviceId, ipHash: ipHash(req), type, size, photo: Buffer.from(await photo.arrayBuffer()), mimeType: photo.type,
  });
  if (result.ok) return NextResponse.json(result);
  const status = result.error === "no_consent" ? 403 : result.error === "quota" ? 429 : 422;
  return NextResponse.json(result, { status });
}
