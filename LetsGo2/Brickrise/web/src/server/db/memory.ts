import "server-only";
import type { ConsentRecord, Draft, OrderCode, OrderVerification, Store } from "./types";

/** 개발용 메모리 저장소. 서버를 재시작하면 사라진다. */
export class MemoryStore implements Store {
  consents: ConsentRecord[] = [];
  drafts = new Map<string, Draft>();
  codes = new Map<string, OrderCode>();
  verifications: OrderVerification[] = [];
  quota = new Map<string, number>();

  async saveConsent(c: ConsentRecord) { this.consents.push(c); }
  async getLatestConsent(deviceId: string) {
    for (let i = this.consents.length - 1; i >= 0; i--) if (this.consents[i].deviceId === deviceId) return this.consents[i];
    return null;
  }
  async createDraft(d: Draft) { this.drafts.set(d.id, d); }
  async getDraft(id: string) { return this.drafts.get(id) ?? null; }
  async findReusableDraft(deviceId: string, photoHash: string, type: Draft["type"], size: Draft["size"]) {
    let found: Draft | null = null;
    for (const d of this.drafts.values())
      if (d.deviceId === deviceId && d.photoHash === photoHash && d.type === type && d.size === size) if (!found || d.createdAt > found.createdAt) found = d;
    return found;
  }
  async createOrderCode(oc: OrderCode) {
    if (this.codes.has(oc.code)) return false;
    this.codes.set(oc.code, oc);
    return true;
  }
  async getOrderCode(code: string) { return this.codes.get(code) ?? null; }
  async findActiveCodeForDraft(draftId: string, now: Date) {
    for (const c of this.codes.values()) if (c.draftId === draftId && !c.usedAt && c.expiresAt > now) return c;
    return null;
  }
  async markCodeUsed(code: string, orderId: string, at: Date) {
    const c = this.codes.get(code);
    if (!c || c.usedAt) return false;
    c.usedAt = at; c.orderId = orderId;
    return true;
  }
  async listOrderCodes(limit: number) {
    return [...this.codes.values()].sort((a, b) => +b.createdAt - +a.createdAt).slice(0, limit);
  }
  async saveVerification(v: OrderVerification) { this.verifications.push(v); }
  async listVerifications(limit: number) {
    return [...this.verifications].sort((a, b) => +b.createdAt - +a.createdAt).slice(0, limit);
  }
  async getQuotaCounts(keys: string[], day: string) {
    return Object.fromEntries(keys.map((k) => [k, this.quota.get(`${day}|${k}`) ?? 0]));
  }
  async incrementQuota(keys: string[], day: string) {
    for (const k of keys) this.quota.set(`${day}|${k}`, (this.quota.get(`${day}|${k}`) ?? 0) + 1);
  }
}
