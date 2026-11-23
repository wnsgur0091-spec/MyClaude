/**
 * 사진 업로드 전 사이트에서 받는 동의 항목.
 * 문구나 항목이 바뀌면 TERMS_VERSION을 올린다 (동의 기록에 버전이 함께 저장됨).
 * 법률 문구는 변호사 자문 전 초안이다.
 */
export const TERMS_VERSION = "2026-11-draft1";

export type ConsentKey = "privacy" | "overseas" | "rights" | "age14" | "aiUse";

export const CONSENT_ITEMS: ReadonlyArray<{ key: ConsentKey; title: string; detail: string; required: boolean }> = [
  { key: "privacy", title: "개인정보 수집·이용 동의", detail: "올린 사진, 접속 IP·쿠키(무료 횟수 확인) · 시안 생성·주문 처리 목적 · 배송 완료 후 정해진 기간 보관 뒤 파기", required: true },
  { key: "overseas", title: "개인정보 국외 이전 동의", detail: "해외 3D 생성 서비스 사용 시 이전 국가·업체·항목 (업체 확정 후 기재)", required: true },
  { key: "rights", title: "업로드 사진 권리 보증", detail: "본인 소유이거나 권리가 있는 사진이며, 타인의 저작물·초상이 아님", required: true },
  { key: "age14", title: "만 14세 이상 확인", detail: "만 14세 미만은 보호자 동의 후 이용", required: true },
  { key: "aiUse", title: "AI 이미지 활용 동의", detail: "올린 사진과 결과물을 서비스 개선·홍보에 활용", required: false },
];

export type ConsentAnswers = Record<ConsentKey, boolean>;

export function requiredAllAgreed(a: Partial<Record<string, unknown>>): boolean {
  return CONSENT_ITEMS.every((c) => !c.required || a[c.key] === true);
}
