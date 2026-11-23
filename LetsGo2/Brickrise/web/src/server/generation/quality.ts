import type { GridAnalysis } from "./analyze";

export type QualityLimits = { minWidth: number; minMeanLum: number; minSubjectRatio: number; minSharpness: number };
export type QualityIssue = "resolution" | "dark" | "blurry" | "small_subject";

export const QUALITY_MESSAGES: Record<QualityIssue, string> = {
  resolution: "사진 해상도가 너무 낮아요. 원본 사진을 올려 주세요.",
  dark: "사진이 너무 어두워요. 밝은 곳에서 다시 찍어 주세요.",
  blurry: "사진이 흐려요. 초점을 맞춰 다시 찍어 주세요.",
  small_subject: "피사체가 너무 작아요. 가까이에서 크게 찍어 주세요.",
};

/** 품질 검사: 해상도 → 밝기 → 흐림 → 피사체 크기. 처음 걸린 문제를 돌려준다 (없으면 null) */
export function checkQuality(
  input: { width: number; sharpness: number; analysis: GridAnalysis },
  limits: QualityLimits,
): QualityIssue | null {
  if (input.width < limits.minWidth) return "resolution";
  if (input.analysis.meanLum < limits.minMeanLum) return "dark";
  if (input.sharpness < limits.minSharpness) return "blurry";
  if (input.analysis.subjectRatio < limits.minSubjectRatio) return "small_subject";
  return null;
}
