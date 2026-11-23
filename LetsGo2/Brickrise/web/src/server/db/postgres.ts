import "server-only";
import postgres from "postgres";
import { SCHEMA } from "./schema";
import type { ConsentRecord, Draft, OrderCode, OrderVerification, Store } from "./types";

type Row = Record<string, any>;

export class PostgresStore implements Store {
  private sql: postgres.Sql;
  private ready: Promise<void> | null = null;

  constructor(url: string) {
    this.sql = postgres(url, { max: 5, idle_timeout: 20, prepare: false, onnotice: () => {} });
  }

  private init() {
    this.ready ??= this.sql.unsafe(SCHEMA).then(() => undefined).catch((e) => { this.ready = null; throw e; });
    return this.ready;
  }
  private async q() { await this.init(); return this.sql; }

  async saveConsent(c: ConsentRecord) {
    const sql = await this.q();
    await sql`INSERT INTO consents (id, device_id, terms_version, answers, ip_hash, created_at)
      VALUES (${c.id}, ${c.deviceId}, ${c.termsVersion}, ${sql.json(c.answers)}, ${c.ipHash}, ${c.createdAt})`;
  }
  async getLatestConsent(deviceId: string) {
    const sql = await this.q();
    const [r] = await sql`SELECT * FROM consents WHERE device_id = ${deviceId} ORDER BY created_at DESC LIMIT 1`;
    return r ? toConsent(r) : null;
  }

  async createDraft(d: Draft) {
    const sql = await this.q();
    await sql`INSERT INTO drafts (id, device_id, shape, size_cm, photo_hash, photo_key, generator, is_mock, model, block_count, color_count, total, created_at)
      VALUES (${d.id}, ${d.deviceId}, ${d.type}, ${d.size}, ${d.photoHash}, ${d.photoKey}, ${d.generator}, ${d.isMock},
              ${sql.json(d.model)}, ${d.blockCount}, ${d.colorCount}, ${d.total}, ${d.createdAt})`;
  }
  async getDraft(id: string) {
    if (!isUuid(id)) return null;
    const sql = await this.q();
    const [r] = await sql`SELECT * FROM drafts WHERE id = ${id}`;
    return r ? toDraft(r) : null;
  }
  async findReusableDraft(deviceId: string, photoHash: string, type: Draft["type"], size: Draft["size"]) {
    const sql = await this.q();
    const [r] = await sql`SELECT * FROM drafts WHERE device_id = ${deviceId} AND photo_hash = ${photoHash}
      AND shape = ${type} AND size_cm = ${size} ORDER BY created_at DESC LIMIT 1`;
    return r ? toDraft(r) : null;
  }

  async createOrderCode(oc: OrderCode) {
    const sql = await this.q();
    const rows = await sql`INSERT INTO order_codes (code, draft_id, shape, size_cm, block_count, block_qty, total, created_at, expires_at)
      VALUES (${oc.code}, ${oc.draftId}, ${oc.type}, ${oc.size}, ${oc.blockCount}, ${oc.blockQty}, ${oc.total}, ${oc.createdAt}, ${oc.expiresAt})
      ON CONFLICT (code) DO NOTHING RETURNING code`;
    return rows.length === 1;
  }
  async getOrderCode(code: string) {
    const sql = await this.q();
    const [r] = await sql`SELECT * FROM order_codes WHERE code = ${code}`;
    return r ? toCode(r) : null;
  }
  async findActiveCodeForDraft(draftId: string, now: Date) {
    const sql = await this.q();
    const [r] = await sql`SELECT * FROM order_codes WHERE draft_id = ${draftId} AND used_at IS NULL AND expires_at > ${now}
      ORDER BY created_at DESC LIMIT 1`;
    return r ? toCode(r) : null;
  }
  async markCodeUsed(code: string, orderId: string, at: Date) {
    const sql = await this.q();
    const rows = await sql`UPDATE order_codes SET used_at = ${at}, order_id = ${orderId} WHERE code = ${code} AND used_at IS NULL RETURNING code`;
    return rows.length === 1;
  }
  async listOrderCodes(limit: number) {
    const sql = await this.q();
    return (await sql`SELECT * FROM order_codes ORDER BY created_at DESC LIMIT ${limit}`).map(toCode);
  }

  async saveVerification(v: OrderVerification) {
    const sql = await this.q();
    await sql`INSERT INTO order_verifications (id, code, naver_order_no, paid_shape, paid_size_cm, paid_qty, paid_amount, passed, checks, created_at)
      VALUES (${v.id}, ${v.code}, ${v.naverOrderNo}, ${v.paidType}, ${v.paidSize}, ${v.paidQty}, ${v.paidAmount}, ${v.passed}, ${sql.json(v.checks)}, ${v.createdAt})`;
  }
  async listVerifications(limit: number) {
    const sql = await this.q();
    return (await sql`SELECT * FROM order_verifications ORDER BY created_at DESC LIMIT ${limit}`).map(toVerification);
  }

  async getQuotaCounts(keys: string[], day: string) {
    const sql = await this.q();
    const rows = await sql`SELECT key, count FROM quota_counters WHERE day = ${day} AND key IN ${sql(keys)}`;
    const out: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
    for (const r of rows) out[r.key] = r.count;
    return out;
  }
  async incrementQuota(keys: string[], day: string) {
    const sql = await this.q();
    for (const k of keys)
      await sql`INSERT INTO quota_counters (day, key, count) VALUES (${day}, ${k}, 1)
        ON CONFLICT (day, key) DO UPDATE SET count = quota_counters.count + 1`;
    // 이틀 지난 카운터 정리
    await sql`DELETE FROM quota_counters WHERE day < (${day}::date - 2)`;
  }
}

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const toConsent = (r: Row): ConsentRecord => ({
  id: r.id, deviceId: r.device_id, termsVersion: r.terms_version, answers: r.answers, ipHash: r.ip_hash, createdAt: new Date(r.created_at),
});
const toDraft = (r: Row): Draft => ({
  id: r.id, deviceId: r.device_id, type: r.shape, size: r.size_cm, photoHash: r.photo_hash, photoKey: r.photo_key,
  generator: r.generator, isMock: r.is_mock, model: r.model, blockCount: r.block_count, colorCount: r.color_count,
  total: r.total, createdAt: new Date(r.created_at),
});
const toCode = (r: Row): OrderCode => ({
  code: r.code, draftId: r.draft_id, type: r.shape, size: r.size_cm, blockCount: r.block_count, blockQty: r.block_qty,
  total: r.total, createdAt: new Date(r.created_at), expiresAt: new Date(r.expires_at),
  usedAt: r.used_at ? new Date(r.used_at) : null, orderId: r.order_id,
});
const toVerification = (r: Row): OrderVerification => ({
  id: r.id, code: r.code, naverOrderNo: r.naver_order_no, paidType: r.paid_shape, paidSize: r.paid_size_cm,
  paidQty: r.paid_qty, paidAmount: r.paid_amount, passed: r.passed, checks: r.checks, createdAt: new Date(r.created_at),
});
