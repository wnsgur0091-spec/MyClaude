import "server-only";
import { config } from "../config";
import { MemoryStore } from "./memory";
import { PostgresStore } from "./postgres";
import type { Store } from "./types";

const g = globalThis as unknown as { __brickriseStore?: Store };

/** DATABASE_URL이 있으면 Postgres, 없으면 메모리 저장소 (개발 서버 재시작 시 초기화) */
export function getStore(): Store {
  if (!g.__brickriseStore) {
    if (config.databaseUrl) g.__brickriseStore = new PostgresStore(config.databaseUrl);
    else {
      if (config.isProd) console.warn("[brickrise] DATABASE_URL이 없어 메모리 저장소를 사용합니다. 데이터가 유지되지 않습니다.");
      g.__brickriseStore = new MemoryStore();
    }
  }
  return g.__brickriseStore;
}

export const storageMode = () => (config.databaseUrl ? "postgres" : "memory");
export type * from "./types";
export { paymentTotal } from "./types";
