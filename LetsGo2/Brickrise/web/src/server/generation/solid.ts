import { emptyModel, setCell, type BrickModel } from "@/shared/model";
import type { SizeCm } from "@/shared/options";
import type { GridAnalysis } from "./analyze";

/**
 * 입체 생성기 인터페이스.
 * 실제 구현(사진 → image-to-3D → 복셀화 → 디폼블럭 배치)은 타 팀원이 개발 중이며,
 * 사용할 생성형 AI와 API 규격이 정해지면 이 인터페이스를 구현한 생성기를 추가해 getSolidGenerator()에서 바꾼다.
 * 자세한 내용: docs/ai-pipeline-interface.md
 */
export interface SolidGenerator {
  /** 시안 기록에 남는 생성기 이름 */
  readonly name: string;
  /** true면 고객 화면에 '시연용 간이 입체' 안내를 띄운다 */
  readonly isMock: boolean;
  generate(input: SolidInput): Promise<BrickModel>;
}

export type SolidInput = {
  /** EXIF 회전 반영 전 원본 사진 바이트 */
  photo: Buffer;
  mimeType: string;
  size: SizeCm;
  /** 가로 칸 수 (5cm=6, 10cm=12, 15cm=18) */
  cols: number;
  /** 평면 배색 결과 (임시 생성기용; 실제 생성기는 쓰지 않아도 됨) */
  analysis: GridAnalysis;
};

/** 임시 생성기: 실루엣 안쪽일수록 두껍게 부풀린 간이 입체 (docs/demo.html의 puffModel) */
export const mockSolidGenerator: SolidGenerator = {
  name: "mock-puff",
  isMock: true,
  async generate({ analysis: a }) {
    const { cols, rows, idx } = a;
    const dist = new Int16Array(cols * rows).fill(999);
    const q: number[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (idx[i] < 0) { dist[i] = 0; q.push(i); }
        else if (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) { dist[i] = 1; q.push(i); }
      }
    for (let h = 0; h < q.length; h++) {
      const i = q[h], r = (i / cols) | 0, c = i % cols;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
        const j = rr * cols + cc;
        if (dist[j] > dist[i] + 1) { dist[j] = dist[i] + 1; q.push(j); }
      }
    }
    const D = Math.max(1, Math.round(cols * 0.16)), Z = 2 * D - 1;
    const m = emptyModel(cols, rows, Z);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (idx[i] < 0) continue;
        const dh = Math.min(dist[i], D) - 1;
        for (let z = D - 1 - dh; z <= D - 1 + dh; z++) setCell(m, c, rows - 1 - r, z, idx[i]);
      }
    return m;
  },
};

export function getSolidGenerator(): SolidGenerator {
  // TODO: 생성형 AI 업체·API 규격 확정 후 실제 생성기로 교체
  return mockSolidGenerator;
}
