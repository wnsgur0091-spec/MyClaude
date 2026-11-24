import Link from "next/link";
import { VerifyForm } from "@/components/admin/VerifyForm";
import { getStore, paymentTotal } from "@/server/db";
import { optionLabel } from "@/shared/options";
import { won } from "@/shared/pricing";

const fmt = (d: Date) => d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function AdminHome() {
  const store = getStore();
  const [codes, verifications] = await Promise.all([store.listOrderCodes(50), store.listVerifications(50)]);
  const now = new Date();
  return (
    <>
      <div className="grid2">
        <section className="panel">
          <h2>주문 검증</h2>
          <p className="small" style={{ margin: 0 }}>판매자센터의 주문 정보를 입력하면 코드·옵션·수량·금액을 차례로 대조합니다. 모두 맞으면 코드가 사용 처리됩니다.</p>
          <VerifyForm />
        </section>
        <section className="panel">
          <h2>최근 검증</h2>
          {verifications.length === 0 ? <p className="small">아직 없어요.</p> : (
            <div className="table-wrap">
              <table className="list">
                <thead><tr><th>시각</th><th>네이버 주문번호</th><th>코드</th><th>결과</th><th></th></tr></thead>
                <tbody>
                  {verifications.map((v) => {
                    const bad = v.checks.find((c) => !c.ok);
                    return (
                      <tr key={v.id}>
                        <td>{fmt(v.createdAt)}</td>
                        <td className="mono">{v.naverOrderNo || "-"}</td>
                        <td className="mono">{v.code || "-"}</td>
                        <td>{v.passed ? <span className="badge ok">통과</span> : <span className="badge bad">{bad?.title ?? "불일치"}</span>}</td>
                        <td>{v.passed && <Link href={`/admin/orders/${encodeURIComponent(v.code)}`}>보기</Link>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <section className="panel">
        <h2>발급된 주문 코드</h2>
        {codes.length === 0 ? <p className="small">아직 없어요.</p> : (
          <div className="table-wrap">
            <table className="list">
              <thead><tr><th>발급</th><th>코드</th><th>옵션</th><th className="num">블럭 수</th><th className="num">블럭 10개 수량</th><th className="num">결제 금액</th><th>상태</th><th></th></tr></thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.code}>
                    <td>{fmt(c.createdAt)}</td>
                    <td className="mono">{c.code}</td>
                    <td>{optionLabel(c.type, c.size)}</td>
                    <td className="num">{c.blockCount.toLocaleString()}</td>
                    <td className="num">{c.blockQty}</td>
                    <td className="num">{won(paymentTotal(c))}</td>
                    <td>{c.usedAt ? <span className="badge ok">주문 확인</span> : c.expiresAt <= now ? <span className="badge">만료</span> : <span className="badge wait">결제 대기</span>}</td>
                    <td><Link href={`/admin/orders/${encodeURIComponent(c.code)}`}>보기</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
