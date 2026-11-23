import type { Metadata } from "next";
import { MakeWizard } from "@/components/customer/MakeWizard";

export const metadata: Metadata = { title: "내 브릭 만들기 · 브릭라이즈" };

export default function MakePage() {
  return <MakeWizard naverStoreUrl={process.env.NEXT_PUBLIC_NAVER_STORE_URL || ""} />;
}
