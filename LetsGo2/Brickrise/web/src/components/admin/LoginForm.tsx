"use client";
import { useState } from "react";

export function LoginForm() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
    setBusy(false);
    if (r.ok) window.location.href = "/admin";
    else setErr((await r.json().catch(() => ({}))).error || "로그인하지 못했어요.");
  }
  return (
    <form className="form" onSubmit={submit}>
      <label htmlFor="pw">비밀번호</label>
      <input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
      {err && <div className="notice warn" role="alert" style={{ marginTop: 8 }}>{err}</div>}
      <button className="btn" style={{ marginTop: 12 }} disabled={busy || !pw}>로그인</button>
    </form>
  );
}
