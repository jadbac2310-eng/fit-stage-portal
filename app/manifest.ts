import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FIT STAGE ポータル",
    short_name: "FIT STAGE",
    description: "FIT STAGE ポータル",
    start_url: "/dashboard",
    display: "standalone",
    // 濃紺（ポータルの色）。ホーム画面のアイコンは濃紺に白いロゴ＋金の線＋PORTAL（2026-11-10）
    background_color: "#17284b",
    theme_color: "#17284b",
    icons: [
      { src: "/icon-portal-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
