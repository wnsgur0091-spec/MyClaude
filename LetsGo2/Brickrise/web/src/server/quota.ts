import "server-only";
import { config } from "./config";
import type { Store } from "./db";

export type QuotaStatus = { deviceUsed: number; ipUsed: number; remaining: number; blocked: boolean };

const keys = (deviceId: string, ipHash: string) => ({ device: `d:${deviceId}`, ip: `i:${ipHash}` });

/** 쿠키(기기) 하루 3회 + IP 하루 15회. 둘 중 하나라도 넘으면 중지 */
export async function getQuota(store: Store, deviceId: string, ipHash: string, day: string): Promise<QuotaStatus> {
  const k = keys(deviceId, ipHash);
  const c = await store.getQuotaCounts([k.device, k.ip], day);
  const { perDevicePerDay, perIpPerDay } = config.quota;
  const deviceUsed = c[k.device] ?? 0, ipUsed = c[k.ip] ?? 0;
  const blocked = deviceUsed >= perDevicePerDay || ipUsed >= perIpPerDay;
  return { deviceUsed, ipUsed, remaining: blocked ? 0 : perDevicePerDay - deviceUsed, blocked };
}

export async function useQuota(store: Store, deviceId: string, ipHash: string, day: string) {
  const k = keys(deviceId, ipHash);
  await store.incrementQuota([k.device, k.ip], day);
}
