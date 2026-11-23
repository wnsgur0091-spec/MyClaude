import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { storageMode } from "@/server/db";

export const metadata: Metadata = { title: "관리자 · 브릭라이즈", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const mem = storageMode() === "memory";
  return (
    <div className="admin">
      <div className="admin-bar">
        <Link href="/admin" className="logo"><i aria-hidden="true" />브릭라이즈 관리자</Link>
        <nav><Link href="/admin">주문 검증 · 목록</Link></nav>
        <div className="right"><LogoutButton /></div>
      </div>
      {mem && <div className="notice demo no-print">DATABASE_URL이 설정되지 않아 메모리 저장소를 쓰고 있어요. 서버가 재시작되면 데이터가 사라집니다.</div>}
      {children}
    </div>
  );
}
