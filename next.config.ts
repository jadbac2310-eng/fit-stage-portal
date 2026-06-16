import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer は fontkit 等を含むためバンドルせず実行時に require する
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
