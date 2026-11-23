import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp는 서버에서만 쓰는 네이티브 모듈이라 번들에 넣지 않는다
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
