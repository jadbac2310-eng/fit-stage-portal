import type { NextConfig } from "next";

/**
 * いま動いているポータルの版（コミットの番号）。画面に焼き込み、サーバーの版と比べて
 * 「古い画面のまま保存して英語のエラーが出る」のを防ぐ（components/layout/deploy-guard.tsx）。
 */
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || "dev";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  // @react-pdf/renderer は fontkit 等を含むためバンドルせず実行時に require する
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
