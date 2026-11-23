import "server-only";
import sharp from "sharp";
import type { RgbaImage } from "./analyze";

export type DecodedPhoto = {
  /** EXIF 회전 반영 후 원본 크기 */
  width: number;
  height: number;
  /** 배색용 축소 RGBA (가로 최대 240px) */
  small: RgbaImage;
  /** 흐림 검사용 회색조 (가로 최대 400px) */
  gray: { width: number; height: number; data: Buffer };
};

export async function decodePhoto(buf: Buffer): Promise<DecodedPhoto> {
  const base = sharp(buf, { failOn: "error", limitInputPixels: 50_000_000 }).rotate();
  const meta = await sharp(buf).metadata();
  if (!meta.width || !meta.height) throw new Error("이미지 크기를 읽을 수 없음");
  // EXIF 방향 5~8은 90° 회전이라 가로·세로가 바뀐다
  const swap = (meta.orientation ?? 1) >= 5;
  const width = swap ? meta.height : meta.width, height = swap ? meta.width : meta.height;

  const small = await base.clone().resize({ width: Math.min(240, width), withoutEnlargement: true }).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const gray = await base.clone().resize({ width: Math.min(400, width), withoutEnlargement: true }).grayscale().raw()
    .toBuffer({ resolveWithObject: true });

  return {
    width, height,
    small: { width: small.info.width, height: small.info.height, data: small.data },
    gray: { width: gray.info.width, height: gray.info.height, data: gray.data },
  };
}
