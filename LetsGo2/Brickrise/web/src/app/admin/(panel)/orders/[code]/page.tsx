import { notFound } from "next/navigation";
import { BrickCanvas } from "@/components/BrickCanvas";
import { PrintButton } from "@/components/admin/PrintButton";
import { config } from "@/server/config";
import { getStore } from "@/server/db";
import { colorCounts, sizeMm } from "@/shared/model";
import { normalizeCode } from "@/shared/orderCode";
import { optionLabel } from "@/shared/options";
import { PALETTE } from "@/shared/palette";
import { won } from "@/shared/pricing";

/** 여분: 색상별 5% (최소 2개) — prototype/cube.py와 같은 규칙 */
const spare = (n: number) => Math.max(2, Math.ceil(n * 0.05));

/** 작업지시서: 색상별 개수(여분 포함)·무게 환산 */
export default async function WorkOrderPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const store = getStore();
  const oc = await store.getOrderCode(normalizeCode(decodeURIComponent(raw)));
  if (!oc) notFound();
  const draft = await store.getDraft(oc.draftId);
  if (!draft) notFound();

  const counts = colorCounts(draft.model).map((c) => ({ ...c, spare: spare(c.count) }));
  const totalPick = counts.reduce((s, c) => s + c.count + c.spare, 0);
  const w = config.blockWeightG;

  return (
    <>
      <section className="panel">
        <div className="row" style={{ alignItems: "center" }}>
          <h2>작업지시서 <span className="mono" style={{ fontSize: 18 }}>{oc.code}</span></h2>
          <div style={{ flex: "none" }} className="no-print"><PrintButton /></div>
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <div><div className="label">옵션</div>{optionLabel(oc.type, oc.size)}</div>
          <div><div className="label">크기</div>{sizeMm(draft.model, draft.type === "flat")}</div>
          <div><div className="label">블럭 수</div>{oc.blockCount.toLocaleString()}개 ({counts.length}색)</div>
          <div><div className="label">피킹 합계 (여분 포함)</div>{totalPick.toLocaleString()}개{w ? ` · 약 ${Math.round(totalPick * w).toLocaleString()}g` : ""}</div>
          <div><div className="label">금액</div>{won(oc.total)}</div>
          <div><div className="label">상태</div>{oc.usedAt ? "주문 확인됨" : "결제 대기 (검증 전)"}</div>
        </div>
        {!oc.usedAt && <div className="notice warn">아직 주문 검증을 통과하지 않은 코드예요. 검증 후 작업해 주세요.</div>}
        {draft.isMock && <div className="notice demo">시연용 간이 입체로 만든 시안이에요 (실제 3D 생성 아님).</div>}
      </section>
      <div className="grid2">
        <section className="panel">
          <h2>완성 이미지</h2>
          <div className="view"><BrickCanvas model={draft.model} flat={draft.type === "flat"} rot={3} /></div>
        </section>
        <section className="panel">
          <h2>색상별 개수</h2>
          <div className="table-wrap">
            <table className="list">
              <thead><tr><th>번호</th><th>색상</th><th className="num">필요</th><th className="num">여분</th><th className="num">담을 개수</th>{w && <th className="num">무게(g)</th>}</tr></thead>
              <tbody>
                {counts.map(({ color, count, spare: sp }) => (
                  <tr key={color}>
                    <td className="mono">{PALETTE[color].no}</td>
                    <td><span className="sw" style={{ display: "inline-flex", padding: 0, background: "none" }}><i style={{ background: `rgb(${PALETTE[color].rgb.join(",")})` }} />{PALETTE[color].name}</span></td>
                    <td className="num">{count}</td>
                    <td className="num">{sp}</td>
                    <td className="num"><b>{count + sp}</b></td>
                    {w && <td className="num">{Math.round((count + sp) * w)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!w && <p className="small" style={{ margin: 0 }}>무게 환산은 BLOCK_WEIGHT_G(블럭 1개 무게) 환경변수를 설정하면 표시돼요.</p>}
        </section>
      </div>
    </>
  );
}
