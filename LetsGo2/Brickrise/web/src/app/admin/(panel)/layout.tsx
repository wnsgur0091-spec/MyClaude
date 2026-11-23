import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { storageMode } from "@/server/db";
import { blobEnabled } from "@/server/storage";
import { config } from "@/server/config";

export const metadata: Metadata = { title: "관리자 · 브릭라이즈", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const mem = storageMode() === "memory";
  const noPhotos = config.isProd && !blobEnabled();
  return (
    <div className="admin">
      <div className="admin-bar">
        <Link href="/admin" className="logo"><i aria-hidden="true" />브릭라이즈 관리자</Link>
        <nav><Link href="/admin">주문 검증 · 목록</Link></nav>
        <div className="right"><LogoutButton /></div>
      </div>
      {mem && <div className="notice demo no-print">DATABASE_URL이 설정되지 않아 메모리 저장소를 쓰고 있어요. 서버가 재시작되면 데이터가 사라집니다.</div>}
      {noPhotos && <div className="notice demo no-print">Blob 저장소가 연결되지 않아 고객 사진 원본을 저장하지 않고 있어요. Vercel Storage 탭에서 Blob을 이 프로젝트에 연결한 뒤 다시 배포해 주세요.</div>}
      {children}
    </div>
  );
}
