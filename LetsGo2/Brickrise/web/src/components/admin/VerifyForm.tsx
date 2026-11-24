"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { normalizeCode, parseCode } from "@/shared/orderCode";
import { optionLabel, SHAPES, SIZES, type ShapeType, type SizeCm } from "@/shared/options";
import { won } from "@/shared/pricing";

type Check = { key: string; ok: boolean; title: string; message: string };
type Result = { passed: boolean; code: string; checks: Check[] };
type CodeInfo = {
  code: string; type: ShapeType; size: SizeCm; blockCount: number; blockQty: number;
  productTotal: number; shippingFee: number; paymentTotal: number; expiresAt: string; usedAt: string | null; naverOrderNo: string | null;
};

const STEPS = [["code", "주문 코드 확인"], ["opt", "옵션 일치"], ["qty", "수량 일치"], ["amt", "금액 확인"]] as const;
const NOT_FOUND = "주문 내역이 없습니다. 주문 코드를 다시 확인해 주세요.";

export function VerifyForm() {
  const [f, setF] = useState({ naverOrderNo: "", code: "", option: "flat-10", qty: "", amount: "" });
  const [info, setInfo] = useState<CodeInfo | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const looked = useRef<string>(""); // 같은 코드로 조회·알림을 반복하지 않도록
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  /** 주문 코드로 발급 정보를 조회해 나머지 칸을 채운다. 없으면 알림 */
  async function lookup(raw: string) {
    const code = normalizeCode(raw);
    if (!code || code === looked.current) return;
    looked.current = code;
    setRes(null);
    if (!parseCode(code)) { setInfo(null); window.alert(NOT_FOUND); return; }
    const r = await fetch(`/api/admin/order-codes/${encodeURIComponent(code)}`);
    if (looked.current !== code) return; // 조회 중에 다른 코드로 바뀜
    if (!r.ok) { setInfo(null); window.alert(r.status === 404 ? NOT_FOUND : "주문 코드를 조회하지 못했어요."); return; }
    const d: CodeInfo = await r.json();
    setInfo(d);
    setF((p) => ({
      ...p, code: d.code, option: `${d.type}-${d.size}`, qty: String(d.blockQty), amount: String(d.paymentTotal),
      naverOrderNo: d.naverOrderNo ?? p.naverOrderNo,
    }));
  }

  function onCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setF((p) => ({ ...p, code: v }));
    if (normalizeCode(v) !== looked.current) { setInfo(null); looked.current = ""; }
    // 형식이 완성되면 바로 조회 (잘못된 형식 알림은 입력을 마쳤을 때만)
    if (parseCode(v)) lookup(v);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setRes(null);
    const [type, size] = f.option.split("-");
    const r = await fetch("/api/admin/verify", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ naverOrderNo: f.naverOrderNo, code: f.code, type, size: Number(size), qty: Number(f.qty), amount: Number(f.amount) }),
    });
    setBusy(false);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(data.error || "검증하지 못했어요.");
    setRes(data);
  }

  const differs = (k: "option" | "qty" | "amount") => {
    if (!info) return false;
    if (k === "option") return f.option !== `${info.type}-${info.size}`;
    if (k === "qty") return f.qty !== String(info.blockQty);
    return f.amount !== String(info.paymentTotal);
  };
  const hint = (k: "option" | "qty" | "amount", text: string) =>
    info && <small className={differs(k) ? "field-hint diff" : "field-hint"}>시안 기준: {text}{differs(k) ? " · 입력값과 다름" : ""}</small>;

  return (
    <>
      <form className="form" onSubmit={submit}>
        <label htmlFor="v-code">주문 코드 (고객 입력값 그대로)</label>
        <input id="v-code" className="mono" value={f.code} onChange={onCodeChange} onBlur={() => lookup(f.code)}
          onKeyDown={(e) => { if (e.key === "Enter" && !info) { e.preventDefault(); lookup(f.code); } }}
          placeholder="BR-2D10-XXXX" autoComplete="off" required />
        {info && (
          <div className="notice">
            코드 발급 정보로 채웠어요. <b>판매자센터의 실제 결제 내역과 비교해 다른 값은 고친 뒤</b> 검증하세요.
            {info.usedAt && <><br />이미 {new Date(info.usedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}에 검증을 통과한 코드예요.</>}
          </div>
        )}
        <label htmlFor="v-opt">결제 옵션</label>
        <select id="v-opt" value={f.option} onChange={set("option")}>
          {SHAPES.flatMap((t) => SIZES.map((z) => <option key={`${t}-${z}`} value={`${t}-${z}`}>{optionLabel(t, z)}</option>))}
        </select>
        {info && hint("option", optionLabel(info.type, info.size))}
        <label htmlFor="v-qty">추가상품 ‘블럭 10개’ 수량</label>
        <input id="v-qty" type="number" inputMode="numeric" min={0} step={1} value={f.qty} onChange={set("qty")} required />
        {info && hint("qty", `${info.blockQty} (블럭 ${info.blockCount.toLocaleString()}개)`)}
        <label htmlFor="v-amt">결제 금액 (원, 배송비 포함)</label>
        <input id="v-amt" type="number" inputMode="numeric" min={0} step={1} value={f.amount} onChange={set("amount")} required />
        {info && hint("amount", `${won(info.paymentTotal)} (상품 ${won(info.productTotal)} + 배송비 ${won(info.shippingFee)})`)}
        <label htmlFor="v-order">네이버 주문번호 (선택)</label>
        <input id="v-order" value={f.naverOrderNo} onChange={set("naverOrderNo")} autoComplete="off" placeholder="판매자센터에서 복사해 붙여넣기" />
        {/* TODO: 네이버 커머스 API 연동 후 주문 코드로 네이버 주문을 찾아 자동 입력 */}
        <small className="field-hint">차액 결제·부분 환불 때 네이버 주문을 찾기 위한 기록이에요. 네이버 커머스 API를 연동하면 자동으로 채워집니다.</small>
        <button className="btn" style={{ marginTop: 12 }} disabled={busy}>검증하기</button>
      </form>
      {err && <div className="notice warn" role="alert">{err}</div>}
      {res && (
        <>
          <ul className="checks" aria-live="polite">
            {STEPS.map(([k, t]) => {
              const c = res.checks.find((x) => x.key === k);
              const st = !c ? "wait" : c.ok ? "ok" : "bad";
              return (
                <li key={k}>
                  <span className={`dot ${st}`} aria-hidden="true">{st === "ok" ? "✓" : st === "bad" ? "!" : "·"}</span>
                  <div><b>{c?.title ?? t}</b><small>{c ? c.message : "앞 단계에서 멈춤"}</small></div>
                </li>
              );
            })}
          </ul>
          {res.passed
            ? <div className="notice ok">검증 통과. 코드가 사용 처리됐어요. <Link href={`/admin/orders/${encodeURIComponent(res.code)}`}>작업지시서 열기</Link></div>
            : <div className="notice warn">불일치가 있어요. 위 안내대로 네이버 톡톡으로 고객에게 연락해 주세요. 정정 후 다시 검증하면 됩니다.</div>}
        </>
      )}
    </>
  );
}
