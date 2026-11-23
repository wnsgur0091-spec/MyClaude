"use client";
import { useState } from "react";
import Link from "next/link";
import { optionLabel, SHAPES, SIZES } from "@/shared/options";

type Check = { key: string; ok: boolean; title: string; message: string };
type Result = { passed: boolean; code: string; checks: Check[] };

const STEPS = [["code", "주문 코드 확인"], ["opt", "옵션 일치"], ["qty", "수량 일치"], ["amt", "금액 확인"]] as const;

export function VerifyForm() {
  const [f, setF] = useState({ naverOrderNo: "", code: "", option: "flat-10", qty: "", amount: "" });
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

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

  return (
    <>
      <form className="form" onSubmit={submit}>
        <label htmlFor="v-order">네이버 주문번호</label>
        <input id="v-order" value={f.naverOrderNo} onChange={set("naverOrderNo")} autoComplete="off" />
        <label htmlFor="v-code">주문 코드 (고객 입력값 그대로)</label>
        <input id="v-code" className="mono" value={f.code} onChange={set("code")} placeholder="BR-2D10-XXXX" autoComplete="off" required />
        <label htmlFor="v-opt">결제 옵션</label>
        <select id="v-opt" value={f.option} onChange={set("option")}>
          {SHAPES.flatMap((t) => SIZES.map((z) => <option key={`${t}-${z}`} value={`${t}-${z}`}>{optionLabel(t, z)}</option>))}
        </select>
        <label htmlFor="v-qty">추가상품 ‘블럭 10개’ 수량</label>
        <input id="v-qty" type="number" inputMode="numeric" min={0} step={1} value={f.qty} onChange={set("qty")} required />
        <label htmlFor="v-amt">결제 금액 (원, 배송비 제외)</label>
        <input id="v-amt" type="number" inputMode="numeric" min={0} step={1} value={f.amount} onChange={set("amount")} required />
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
