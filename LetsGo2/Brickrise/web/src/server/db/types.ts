import type { BrickModel } from "@/shared/model";
import type { ShapeType, SizeCm } from "@/shared/options";
import type { ConsentAnswers } from "@/shared/consent";

export type ConsentRecord = {
  id: string;
  deviceId: string;
  termsVersion: string;
  answers: ConsentAnswers;
  ipHash: string;
  createdAt: Date;
};

export type Draft = {
  id: string;
  deviceId: string;
  type: ShapeType;
  size: SizeCm;
  photoHash: string;
  photoKey: string | null;
  generator: string;
  isMock: boolean;
  model: BrickModel;
  blockCount: number;
  colorCount: number;
  total: number;
  createdAt: Date;
};

export type OrderCode = {
  code: string;
  draftId: string;
  type: ShapeType;
  size: SizeCm;
  blockCount: number;
  blockQty: number;
  total: number;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  orderId: string | null;
};

export type CheckResult = { key: "code" | "opt" | "qty" | "amt"; ok: boolean; title: string; message: string };

export type OrderVerification = {
  id: string;
  code: string;
  naverOrderNo: string;
  paidType: ShapeType;
  paidSize: SizeCm;
  paidQty: number;
  paidAmount: number;
  passed: boolean;
  checks: CheckResult[];
  createdAt: Date;
};

export interface Store {
  saveConsent(c: ConsentRecord): Promise<void>;
  getLatestConsent(deviceId: string): Promise<ConsentRecord | null>;

  createDraft(d: Draft): Promise<void>;
  getDraft(id: string): Promise<Draft | null>;
  findReusableDraft(deviceId: string, photoHash: string, type: ShapeType, size: SizeCm): Promise<Draft | null>;

  /** 코드가 이미 있으면 false */
  createOrderCode(oc: OrderCode): Promise<boolean>;
  getOrderCode(code: string): Promise<OrderCode | null>;
  findActiveCodeForDraft(draftId: string, now: Date): Promise<OrderCode | null>;
  /** 아직 안 쓴 코드만 사용 처리. 이미 쓰였으면 false */
  markCodeUsed(code: string, orderId: string, at: Date): Promise<boolean>;
  listOrderCodes(limit: number): Promise<OrderCode[]>;

  saveVerification(v: OrderVerification): Promise<void>;
  listVerifications(limit: number): Promise<OrderVerification[]>;

  getQuotaCounts(keys: string[], day: string): Promise<Record<string, number>>;
  incrementQuota(keys: string[], day: string): Promise<void>;
}
