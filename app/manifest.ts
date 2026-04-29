import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FIT STAGE ポータル",
    short_name: "FIT STAGE",
    description: "FIT STAGE ポータル",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      { src: "/logo.png", sizes: "any", type: "image/png" },
    ],
  };
}
