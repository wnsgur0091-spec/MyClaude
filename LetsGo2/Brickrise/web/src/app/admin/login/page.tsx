import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "관리자 로그인 · 브릭라이즈", robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <div className="admin" style={{ maxWidth: 420 }}>
      <div className="admin-bar"><span className="logo"><i aria-hidden="true" />브릭라이즈 관리자</span></div>
      <section className="panel"><h2>로그인</h2><LoginForm /></section>
    </div>
  );
}
