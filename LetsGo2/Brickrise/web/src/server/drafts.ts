import "server-only";
import { CELLS, type ShapeType, type SizeCm } from "@/shared/options";
import { colorCounts, countBlocks, type BrickModel } from "@/shared/model";
import { calcPrice } from "@/shared/pricing";
import { config } from "./config";
import { getStore, type Draft } from "./db";
import { newId, sha256, todayKst } from "./ids";
import { getQuota, useQuota } from "./quota";
import { savePhoto } from "./storage";
import { analyzeGrid, sharpness } from "./generation/analyze";
import { decodePhoto } from "./generation/image";
import { checkQuality, QUALITY_MESSAGES, type QualityIssue } from "./generation/quality";
import { flatModel } from "./generation/flat";
import { getSolidGenerator } from "./generation/solid";

export type DraftView = {
  id: string;
  type: ShapeType;
  size: SizeCm;
  model: BrickModel;
  blockCount: number;
  colorCount: number;
  isMock: boolean;
  price: ReturnType<typeof calcPrice>;
};

export type CreateDraftResult =
  | { ok: true; draft: DraftView; reused: boolean; remaining: number }
  | { ok: false; error: "no_consent" | "bad_image" | "quota"; message: string; remaining?: number }
  | { ok: false; error: "quality"; issue: QualityIssue; message: string };

export function toDraftView(d: Draft): DraftView {
  return {
    id: d.id, type: d.type, size: d.size, model: d.model, blockCount: d.blockCount, colorCount: d.colorCount,
    isMock: d.isMock, price: calcPrice(d.type, d.size, d.blockCount),
  };
}

/**
 * 시안 만들기: 동의 확인 → 품질 검사(불합격은 차감 없음) → 같은 사진·옵션이면 이전 결과 재사용(차감 없음)
 * → 무료 횟수 확인 → 생성 → 저장 → 횟수 차감
 */
export async function createDraft(input: {
  deviceId: string; ipHash: string; type: ShapeType; size: SizeCm; photo: Buffer; mimeType: string;
}): Promise<CreateDraftResult> {
  const store = getStore();
  const day = todayKst();

  if (!(await store.getLatestConsent(input.deviceId)))
    return { ok: false, error: "no_consent", message: "사진을 올리기 전에 동의가 필요해요." };

  let decoded;
  try { decoded = await decodePhoto(input.photo); }
  catch { return { ok: false, error: "bad_image", message: "사진을 읽지 못했어요. 다른 사진을 골라 주세요." }; }

  const cols = CELLS[input.size];
  const analysis = analyzeGrid(decoded.small, cols);
  const issue = checkQuality(
    { width: decoded.width, sharpness: sharpness(decoded.gray.data, decoded.gray.width, decoded.gray.height), analysis },
    config.quality,
  );
  if (issue) return { ok: false, error: "quality", issue, message: `${QUALITY_MESSAGES[issue]} (무료 횟수는 차감되지 않았어요)` };

  const photoHash = sha256(input.photo);
  const prev = await store.findReusableDraft(input.deviceId, photoHash, input.type, input.size);
  if (prev) {
    const q = await getQuota(store, input.deviceId, input.ipHash, day);
    return { ok: true, draft: toDraftView(prev), reused: true, remaining: q.remaining };
  }

  const q = await getQuota(store, input.deviceId, input.ipHash, day);
  if (q.blocked) return { ok: false, error: "quota", message: "오늘 무료 시안을 모두 사용했어요. 내일 다시 이용해 주세요.", remaining: 0 };

  let model: BrickModel, generator: string, isMock: boolean;
  if (input.type === "flat") {
    model = flatModel(analysis); generator = "flat-v1"; isMock = false;
  } else {
    const g = getSolidGenerator();
    model = await g.generate({ photo: input.photo, mimeType: input.mimeType, size: input.size, cols, analysis });
    generator = g.name; isMock = g.isMock;
  }

  const blockCount = countBlocks(model);
  const id = newId();
  const photoKey = await savePhoto(id, input.photo, input.mimeType);
  const draft: Draft = {
    id, deviceId: input.deviceId, type: input.type, size: input.size, photoHash, photoKey, generator, isMock, model,
    blockCount, colorCount: colorCounts(model).length, total: calcPrice(input.type, input.size, blockCount).total, createdAt: new Date(),
  };
  await store.createDraft(draft);
  await useQuota(store, input.deviceId, input.ipHash, day);
  return { ok: true, draft: toDraftView(draft), reused: false, remaining: Math.max(0, q.remaining - 1) };
}
