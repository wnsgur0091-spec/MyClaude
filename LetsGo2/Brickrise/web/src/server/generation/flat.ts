import { emptyModel, setCell, type BrickModel } from "@/shared/model";
import type { GridAnalysis } from "./analyze";

/** 평면: 배색 격자를 그대로 한 층짜리 모델로 */
export function flatModel(a: GridAnalysis): BrickModel {
  const m = emptyModel(a.cols, 1, a.rows);
  for (let r = 0; r < a.rows; r++) for (let c = 0; c < a.cols; c++) setCell(m, c, 0, r, a.idx[r * a.cols + c]);
  return m;
}
