import { Noto_Serif_JP } from "next/font/google";

/**
 * ハンドブックだけセリフ体。HP（Cormorant Garamond + Noto Serif JP）と同じ世界観に寄せる。
 * ほかの画面は今までどおり Geist。
 */
export const serif = Noto_Serif_JP({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-handbook-serif",
});
