"use client";
import { useEffect, useRef, useState } from "react";
import { BrickCanvas } from "@/components/BrickCanvas";
import { CONSENT_ITEMS, type ConsentKey } from "@/shared/consent";
import { sizeMm, type BrickModel } from "@/shared/model";
import { CELLS, optionLabel, SIZES, type ShapeType, type SizeCm } from "@/shared/options";
import { BASE_PRICE, PRICE_PER_10_BLOCKS, won, type Price } from "@/shared/pricing";
import { preparePhoto } from "./photo";

type Step = "options" | "consent" | "upload" | "check" | "result" | "code";
const STEP_ORDER: Step[] = ["options", "consent", "upload", "check", "result", "code"];

type DraftView = {
  id: string; type: ShapeType; size: SizeCm; model: BrickModel; blockCount: number; colorCount: number; isMock: boolean; price: Price;
};
type CodeView = { code: string; type: ShapeType; size: SizeCm; blockCount: number; blockQty: number; total: number; expiresAt: string };
type CheckState = "wait" | "run" | "ok" | "bad";
type Checks = { q: [CheckState, string]; n: [CheckState, string]; g: [CheckState, string] };

const initialChecks = (): Checks => ({ q: ["wait", "밝기 · 흐림 · 피사체 크기 · 해상도"], n: ["wait", "기기 기준 하루 3회"], g: ["wait", ""] });

export function MakeWizard({ naverStoreUrl }: { naverStoreUrl: string }) {
  const [step, setStep] = useState<Step>("options");
  const [type, setType] = useState<ShapeType>("flat");
  const [size, setSize] = useState<SizeCm>(10);
  const [session, setSession] = useState<{ consented: boolean; remaining: number; perDay: number } | null>(null);
  const [consent, setConsent] = useState<Record<ConsentKey, boolean>>({ privacy: false, overseas: false, rights: false, age14: false, aiUse: false });
  const [photo, setPhoto] = useState<{ blob: Blob; previewUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<Checks>(initialChecks);
  const [checkFail, setCheckFail] = useState<{ message: string; retry: Step } | null>(null);
  const [draft, setDraft] = useState<DraftView | null>(null);
  const [rot, setRot] = useState(3);
  const [code, setCode] = useState<CodeView | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const topRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch("/api/session").then((r) => r.json()).then(setSession).catch(() => setSession({ consented: false, remaining: 3, perDay: 3 }));
  }, []);
  useEffect(() => { topRef.current?.scrollIntoView({ block: "start" }); setError(null); }, [step]);

  const go = (s: Step) => setStep(s);
  const progress = ((STEP_ORDER.indexOf(step) + 1) / STEP_ORDER.length) * 100;

  async function submitConsent() {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/consents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(consent) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "동의를 저장하지 못했어요.");
      setSession((s) => (s ? { ...s, consented: true } : s));
      go("upload");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function pickFile(f: File | undefined) {
    if (!f) return;
    setError(null);
    try {
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      setPhoto(await preparePhoto(f));
    } catch { setError("사진을 읽지 못했어요. 다른 사진을 골라 주세요."); }
  }

  async function generate() {
    if (!photo) return;
    go("check");
    setCheckFail(null);
    const c = initialChecks();
    c.q = ["run", c.q[1]];
    c.g = ["wait", type === "solid" ? "3D 모델 → 디폼블럭 배치" : "픽셀 배치 · 36색 배색"];
    setChecks({ ...c });
    const fd = new FormData();
    fd.set("type", type); fd.set("size", String(size));
    fd.set("photo", photo.blob, photo.blob.type === "image/png" ? "photo.png" : photo.blob.type === "image/webp" ? "photo.webp" : "photo.jpg");
    let res: Response, data: any;
    try {
      res = await fetch("/api/drafts", { method: "POST", body: fd });
      data = await res.json();
    } catch {
      setChecks((p) => ({ ...p, q: ["bad", "연결 오류"] }));
      setCheckFail({ message: "서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요. (횟수 차감 없음)", retry: "upload" });
      return;
    }
    if (!data.ok) {
      if (data.error === "quality" || data.error === "bad_image") {
        setChecks((p) => ({ ...p, q: ["bad", "다시 찍어 주세요"] }));
        setCheckFail({ message: data.message, retry: "upload" });
      } else if (data.error === "quota") {
        setChecks((p) => ({ ...p, q: ["ok", "통과"], n: ["bad", "0회 남음"] }));
        setSession((s) => (s ? { ...s, remaining: 0 } : s));
        setCheckFail({ message: data.message, retry: "options" });
      } else if (data.error === "no_consent") {
        setSession((s) => (s ? { ...s, consented: false } : s));
        setChecks((p) => ({ ...p, q: ["bad", "동의 필요"] }));
        setCheckFail({ message: data.message, retry: "consent" });
      } else {
        setChecks((p) => ({ ...p, q: ["bad", "오류"] }));
        setCheckFail({ message: data.message || "시안을 만들지 못했어요.", retry: "upload" });
      }
      return;
    }
    const d: DraftView = data.draft;
    setSession((s) => (s ? { ...s, remaining: data.remaining } : s));
    setChecks({
      q: ["ok", "통과"],
      n: ["ok", data.reused ? "같은 사진이라 저장된 결과 사용 (차감 없음)" : `${data.remaining}회 남음`],
      g: ["ok", `블럭 ${d.blockCount.toLocaleString()}개`],
    });
    setDraft(d); setRot(3); setCode(null);
    await new Promise((r) => setTimeout(r, 500));
    go("result");
  }

  async function issueCode() {
    if (!draft) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/order-codes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ draftId: draft.id }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "주문 코드를 만들지 못했어요.");
      setCode(data); go("code");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function copyCode() {
    if (!code) return;
    try { await navigator.clipboard.writeText(code.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* 길게 눌러 복사 */ }
  }

  const requiredCount = CONSENT_ITEMS.filter((c) => c.required).length;
  const requiredOk = CONSENT_ITEMS.filter((c) => c.required && consent[c.key]).length;
  const allChecked = CONSENT_ITEMS.every((c) => consent[c.key]);
  const remaining = session?.remaining ?? 3, perDay = session?.perDay ?? 3;

  return (
    <>
      <div className="progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      <main className="screen" ref={topRef}>
        {step === "options" && (
          <>
            <h2>어떻게 만들까요?</h2>
            <p className="lead">로그인 없이 바로 시작해요. 무료 시안은 하루 {perDay}번까지 만들 수 있어요.</p>
            <div className="label">형태</div>
            <div className="choice c2">
              <button type="button" className="opt" aria-pressed={type === "flat"} onClick={() => setType("flat")}><b>평면</b><span>사진을 그대로 픽셀 아트로</span></button>
              <button type="button" className="opt" aria-pressed={type === "solid"} onClick={() => setType("solid")}><b>입체</b><span>AI가 만든 3D 모양으로</span></button>
            </div>
            <div className="label">크기 (가로 기준)</div>
            <div className="choice c3">
              {SIZES.map((z) => (
                <button type="button" key={z} className="opt" aria-pressed={size === z} onClick={() => setSize(z)}>
                  <b>{z}cm</b><span>약 {CELLS[z]}칸 · 기본 {won(BASE_PRICE[type][z])}</span>
                </button>
              ))}
            </div>
            {size === 5 && type === "solid" && <div className="notice">5cm 입체는 가로 6칸이라 모양이 아주 단순하게 나와요. 시안을 꼭 확인해 주세요.</div>}
            <div className="spacer" />
            <button type="button" className="btn" disabled={!session} onClick={() => go(session?.consented ? "upload" : "consent")}>다음</button>
          </>
        )}

        {step === "consent" && (
          <>
            <h2>사진을 올리기 전에 확인해 주세요</h2>
            <p className="lead">사진을 받기 전에 동의를 받아야 해서 이 단계에서 한 번만 확인해요.</p>
            <div className="consent">
              <label className="all">
                <input type="checkbox" checked={allChecked}
                  onChange={(e) => setConsent(Object.fromEntries(CONSENT_ITEMS.map((c) => [c.key, e.target.checked])) as Record<ConsentKey, boolean>)} />
                전체 동의 (선택 포함)
              </label>
              {CONSENT_ITEMS.map((c) => (
                <label key={c.key}>
                  <input type="checkbox" checked={consent[c.key]} onChange={(e) => setConsent({ ...consent, [c.key]: e.target.checked })} />
                  <span><span className={`tag ${c.required ? "req" : "opt"}`}>{c.required ? "필수" : "선택"}</span>{c.title}<small>{c.detail}</small></span>
                </label>
              ))}
            </div>
            <p className="small" style={{ margin: 0 }}>맞춤 제작 청약철회 제한, 시안과 실물 차이는 네이버 상품 페이지와 주문서에서 안내해요.</p>
            {error && <div className="notice warn" role="alert">{error}</div>}
            <div className="spacer" />
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => go("options")}>이전</button>
              <button type="button" className="btn" disabled={requiredOk < requiredCount || busy} onClick={submitConsent}>동의하고 사진 올리기 ({requiredOk}/{requiredCount})</button>
            </div>
          </>
        )}

        {step === "upload" && (
          <>
            <h2>사진 1장을 올려 주세요</h2>
            <span className="chip">오늘 남은 무료 시안 {remaining}회 / {perDay}회</span>
            <ul className="plain small">
              <li>밝은 곳에서 초점을 맞춰 찍어 주세요</li>
              <li>피사체가 화면을 크게 채우고, 잘리지 않게 찍어 주세요</li>
            </ul>
            {photo && <img className="photo" src={photo.previewUrl} alt="올린 사진" />}
            <label className="drop" htmlFor="photo-file"><strong>{photo ? "다른 사진 고르기" : "사진 고르기"}</strong>JPG · PNG · WEBP</label>
            <input id="photo-file" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
            {type === "solid" && <div className="notice">사진을 바탕으로 AI가 3D 모델을 생성합니다. 원본 사진은 배송 완료 후 정해진 기간이 지나면 파기됩니다.</div>}
            {error && <div className="notice warn" role="alert">{error}</div>}
            <div className="spacer" />
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => go("options")}>이전</button>
              <button type="button" className="btn" disabled={!photo || remaining <= 0} onClick={generate}>시안 만들기 (1회 사용)</button>
            </div>
            {remaining <= 0 && <div className="notice warn">오늘 무료 시안을 모두 사용했어요. 내일 다시 이용해 주세요.</div>}
          </>
        )}

        {step === "check" && (
          <>
            <h2>시안을 만들고 있어요</h2>
            <ul className="checks" aria-live="polite">
              {([["q", "사진 품질 검사"], ["n", "오늘 남은 무료 횟수"], ["g", "브릭 시안 생성"]] as const).map(([k, title]) => {
                const [st, sub] = checks[k];
                return (
                  <li key={k}>
                    <span className={`dot ${st}`} aria-hidden="true">{st === "ok" ? "✓" : st === "bad" ? "!" : "·"}</span>
                    <div><b>{title}</b>{sub && <small>{sub}</small>}</div>
                  </li>
                );
              })}
            </ul>
            {checkFail && <div className="notice warn" role="alert">{checkFail.message}</div>}
            <div className="spacer" />
            {checkFail && (
              <button type="button" className="btn" onClick={() => go(checkFail.retry)}>
                {checkFail.retry === "upload" ? "사진 다시 고르기" : checkFail.retry === "consent" ? "동의하러 가기" : "처음으로"}
              </button>
            )}
          </>
        )}

        {step === "result" && draft && (
          <>
            <h2>시안이 나왔어요</h2>
            <div className="view">
              <span className="ai">AI 생성 예시</span>
              <BrickCanvas model={draft.model} flat={draft.type === "flat"} rot={rot} />
              {draft.type === "solid" && (
                <div className="rot">
                  <button type="button" aria-label="왼쪽으로 돌리기" onClick={() => setRot((r) => r - 1)}>↺</button>
                  <button type="button" aria-label="오른쪽으로 돌리기" onClick={() => setRot((r) => r + 1)}>↻</button>
                </div>
              )}
            </div>
            {draft.isMock && <div className="notice demo">시연용 간이 입체예요. 실서비스에서는 AI가 사진으로 3D 모델을 만듭니다.</div>}
            <div className="stats">
              <div className="stat"><b>{draft.blockCount.toLocaleString()}</b><span>총 블럭 수</span></div>
              <div className="stat"><b>{draft.colorCount}</b><span>사용 색상</span></div>
              <div className="stat"><b>{draft.size}cm</b><span>{sizeMm(draft.model, draft.type === "flat")}</span></div>
            </div>
            <table className="price">
              <tbody>
                <tr><td>기본 제작비 ({optionLabel(draft.type, draft.size)})</td><td>{won(draft.price.base)}</td></tr>
                <tr><td>블럭 {draft.blockCount.toLocaleString()}개 (10개 × {draft.price.blockQty}, 10개당 {won(PRICE_PER_10_BLOCKS)})</td><td>{won(draft.price.blocks)}</td></tr>
                <tr className="total"><td>합계 (무료배송)</td><td>{won(draft.price.total)}</td></tr>
              </tbody>
            </table>
            <p className="small" style={{ margin: 0 }}>색상별 부품 목록과 조립 설명서는 결제 후 보내드려요. 실물은 시안과 색감·디테일이 조금 다를 수 있어요.</p>
            {error && <div className="notice warn" role="alert">{error}</div>}
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => go("options")}>다시 만들기</button>
              <button type="button" className="btn" disabled={busy} onClick={issueCode}>이대로 주문</button>
            </div>
          </>
        )}

        {step === "code" && code && (
          <>
            <h2>주문 코드가 발급됐어요</h2>
            <div className="code" aria-label="주문 코드">{code.code}</div>
            <button type="button" className="btn ghost" onClick={copyCode}>{copied ? "복사했어요" : "코드 복사"}</button>
            <div className="card">
              <div className="label">네이버 스토어에서 이렇게 결제하세요</div>
              <ol className="steps">
                <li>옵션 <b>{optionLabel(code.type, code.size)}</b> 선택 ({won(BASE_PRICE[code.type][code.size])})<br />
                  <span className="small">코드 가운데 <b>{code.code.split("-")[1]}</b>가 ‘{optionLabel(code.type, code.size)}’라는 뜻이에요. 옵션을 꼭 같게 골라 주세요.</span></li>
                <li>추가상품 <b>블럭 10개</b> 수량 <b>{code.blockQty}</b> 입력</li>
                <li>주문 코드 칸에 <b>{code.code}</b> 붙여넣기</li>
              </ol>
            </div>
            <p className="small" style={{ margin: 0 }}>
              코드는 {new Date(code.expiresAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}까지, 한 번만 쓸 수 있어요.
              옵션·수량이 코드와 다르면 결제 후 네이버 톡톡으로 연락드려요.
            </p>
            <div className="spacer" />
            {naverStoreUrl
              ? <a className="btn naver" href={naverStoreUrl} target="_blank" rel="noopener noreferrer">네이버 스토어로 이동</a>
              : <div className="notice">네이버 스토어 상품 페이지로 돌아가 결제해 주세요.</div>}
          </>
        )}
      </main>
    </>
  );
}
