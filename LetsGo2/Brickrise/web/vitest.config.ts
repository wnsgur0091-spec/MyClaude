import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // server-only는 Next 서버 번들 밖에서 import하면 에러를 내므로 테스트에서는 빈 모듈로
      "server-only": path.resolve(__dirname, "test/server-only-stub.ts"),
    },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
