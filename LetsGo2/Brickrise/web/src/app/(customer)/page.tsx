import Link from "next/link";
import { SampleView } from "@/components/customer/SampleView";
import { PRICE_PER_10_BLOCKS, SHIPPING_FEE, won } from "@/shared/pricing";

/** 네이버 스토어 상세페이지의 '내 브릭 만들기' 링크가 도착하는 첫 화면 */
export default function HomePage() {
  return (
    <main className="screen">
      <div className="view"><span className="ai">완성 예시</span><SampleView /></div>
      <h2>사진 한 장으로 만드는<br />나만의 블럭 키트</h2>
      <p className="lead">우리 집 강아지, 아끼는 물건을 사진으로 찍어 올리면 그 모양 그대로 조립할 수 있는 블럭 키트를 보내드립니다.</p>
      <div className="card">
        <div className="label">가격 계산</div>
        <p style={{ margin: "4px 0 0" }}>기본 제작비 + 블럭 10개당 {PRICE_PER_10_BLOCKS}원 + 배송비 {won(SHIPPING_FEE)}</p>
      </div>
      <ul className="plain small">
        <li>사용 부품: MYTOYS 디폼블럭 (8×8×7mm). 브릭라이즈는 MYTOYS와 제휴 관계가 없습니다.</li>
        <li>맞춤 제작 상품이라 단순 변심 반품이 어렵습니다. 문의는 네이버 톡톡으로 받습니다.</li>
      </ul>
      <div className="spacer" />
      <Link className="btn" href="/make">내 브릭 만들기 →</Link>
    </main>
  );
}
