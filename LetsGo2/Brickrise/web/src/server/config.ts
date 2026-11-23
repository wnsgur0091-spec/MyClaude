import "server-only";

const isProd = process.env.NODE_ENV === "production";

export const config = {
  isProd,
  databaseUrl: process.env.DATABASE_URL || "",
  blobToken: process.env.BLOB_READ_WRITE_TOKEN || "",
  blockWeightG: Number(process.env.BLOCK_WEIGHT_G) || null,

  /** 무료 시안 횟수: 둘 중 하나라도 넘으면 중지 */
  quota: { perDevicePerDay: 3, perIpPerDay: 15 },

  /** 사진 품질 검사 기준 */
  quality: {
    minWidth: 200,      // 원본 가로 px
    minMeanLum: 40,     // 피사체 평균 밝기 (0~255)
    minSubjectRatio: 0.06, // 피사체가 차지하는 비율
    minSharpness: 6,    // 라플라시안 분산 (낮을수록 흐림)
  },
  /** 업로드 최대 크기 (Vercel 함수 요청 한도 4.5MB 아래) */
  maxUploadBytes: 4 * 1024 * 1024,
};
