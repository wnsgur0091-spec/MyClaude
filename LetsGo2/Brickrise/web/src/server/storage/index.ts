import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { config } from "../config";

/**
 * 파일 저장소: 고객 사진 원본 (이후 3D 모델, 설명서 PDF).
 * - BLOB_READ_WRITE_TOKEN 있음: Vercel Blob에 비공개(private)로 저장
 * - 없음 + 개발: 로컬 .data/ 폴더
 * - 없음 + 운영: 저장하지 않음 (null)
 * 보관 기간 후 자동 삭제는 보관 기간이 정해지면 추가한다.
 */
export async function savePhoto(id: string, data: Buffer, contentType: string): Promise<string | null> {
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `photos/${id}.${ext}`;
  if (config.blobToken) {
    const r = await put(key, data, { access: "private", contentType, token: config.blobToken, addRandomSuffix: true });
    return r.pathname;
  }
  if (!config.isProd) {
    const file = path.join(process.cwd(), ".data", key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
    return `local:${key}`;
  }
  return null;
}
