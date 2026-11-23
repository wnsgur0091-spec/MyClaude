"use client";
export function LogoutButton() {
  return (
    <button type="button" className="btn ghost sm" onClick={async () => { await fetch("/api/admin/login", { method: "DELETE" }); window.location.href = "/admin/login"; }}>
      로그아웃
    </button>
  );
}
