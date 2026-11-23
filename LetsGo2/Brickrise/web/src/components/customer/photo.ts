/**
 * 업로드 전 브라우저에서 사진 줄이기: 긴 변 최대 1600px.
 * 서버 요청 한도(4.5MB) 안에 들어가게 하고, EXIF 회전은 브라우저가 그릴 때 반영된다.
 * 투명 배경 PNG는 투명도를 살리기 위해 PNG(또는 WEBP)로 유지한다.
 */
const MAX_SIDE = 1600;
const MAX_BYTES = 4 * 1024 * 1024;

export async function preparePhoto(file: File): Promise<{ blob: Blob; previewUrl: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error("이미지를 읽을 수 없음"));
      im.src = url;
    });
    const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    cv.getContext("2d")!.drawImage(img, 0, 0, w, h);
    const toBlob = (type: string, q?: number) => new Promise<Blob | null>((res) => cv.toBlob(res, type, q));

    let blob: Blob | null = null;
    if (file.type === "image/png" || file.type === "image/webp") {
      blob = await toBlob("image/webp", 0.92);
      if (!blob || blob.type !== "image/webp") blob = await toBlob("image/png");
      if (blob && blob.size > MAX_BYTES) blob = null;
    }
    blob ??= await toBlob("image/jpeg", 0.9);
    if (!blob) throw new Error("이미지 변환 실패");
    return { blob, previewUrl: URL.createObjectURL(blob) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
