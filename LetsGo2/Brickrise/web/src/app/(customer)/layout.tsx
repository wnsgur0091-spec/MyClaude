import Link from "next/link";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="customer-wrap">
      <div className="phone">
        <header className="bar">
          <Link href="/" className="logo"><i aria-hidden="true" />브릭라이즈</Link>
        </header>
        {children}
      </div>
    </div>
  );
}
