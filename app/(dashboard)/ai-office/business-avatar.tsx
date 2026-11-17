/**
 * AI部署の担当者のアバター（2026-11-16 尚樹「ビジネスマンっぽく」）。
 * スーツ・ネクタイ姿の上半身のイラスト。外から画像を読まない（軽さ優先・SVG だけ）。
 * 髪型とネクタイ（スカーフ）の色で人を描き分ける。準備中の部署は灰色にする。
 */
export type AvatarLook = {
  hair: "short" | "side" | "bob" | "back";
  /** ネクタイ・スカーフの色 */
  accent: string;
  /** スーツの色 */
  suit?: string;
};

const SKIN = "#F1D3BC";
const HAIR = "#2B2420";

export function BusinessAvatar({ look, size = 56, dim = false, title }: { look: AvatarLook; size?: number; dim?: boolean; title?: string }) {
  const suit = dim ? "#9CA3AF" : look.suit ?? "#17284B";
  const accent = dim ? "#D1D5DB" : look.accent;
  const hair = dim ? "#6B7280" : HAIR;
  const skin = dim ? "#E5E7EB" : SKIN;
  const bg = dim ? "#F3F4F6" : "#E8ECF4";
  const female = look.hair === "bob";
  // 同じページに何人も並ぶので、切り抜きの id を人ごとに分ける（同じ id が重なるとブラウザによって崩れる）
  const clipId = `av-${look.hair}-${look.accent.replace(/[^0-9a-z]/gi, "")}${dim ? "-d" : ""}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title ?? "AIの担当者"} className="flex-shrink-0">
      <circle cx="32" cy="32" r="32" fill={bg} />
      <clipPath id={clipId}><circle cx="32" cy="32" r="32" /></clipPath>
      <g clipPath={`url(#${clipId})`}>
        {/* 後ろ髪（ボブ） */}
        {female && <path d="M17 30 C16 14 48 14 47 30 L48 42 L16 42 Z" fill={hair} />}
        {/* 首 */}
        <rect x="27" y="36" width="10" height="9" fill={skin} />
        {/* スーツ */}
        <path d="M8 64 C9 51 18 45 27 44 L32 52 L37 44 C46 45 55 51 56 64 Z" fill={suit} />
        {/* シャツ */}
        <path d="M27 44 L32 52 L37 44 L35 43 L32 47 L29 43 Z" fill="#FFFFFF" />
        {female ? (
          // スカーフ
          <path d="M29 44 L32 49 L35 44 L33.5 51 L30.5 51 Z" fill={accent} />
        ) : (
          // ネクタイ
          <path d="M30.6 45.5 L33.4 45.5 L34.4 55 L32 58 L29.6 55 Z" fill={accent} />
        )}
        {/* 襟 */}
        <path d="M27 44 L24 47 L30 56 L32 52 Z" fill={dim ? "#6B7280" : "#0F1B33"} opacity="0.55" />
        <path d="M37 44 L40 47 L34 56 L32 52 Z" fill={dim ? "#6B7280" : "#0F1B33"} opacity="0.55" />
        {/* 顔 */}
        <ellipse cx="32" cy="27" rx="10" ry="11.5" fill={skin} />
        {/* 耳 */}
        <ellipse cx="22" cy="28" rx="1.8" ry="2.6" fill={skin} />
        <ellipse cx="42" cy="28" rx="1.8" ry="2.6" fill={skin} />
        {/* 髪 */}
        {look.hair === "short" && <path d="M21.5 25 C21 14 43 13 42.5 25 C40 19 35 18 32 18 C28 18 24 19 21.5 25 Z" fill={hair} />}
        {look.hair === "side" && <path d="M21.5 26 C20 13 44 12 42.5 25 C39 20 33 21 27 18.5 C25 21 23 23 21.5 26 Z" fill={hair} />}
        {look.hair === "back" && <path d="M22 24 C22 14 42 14 42 24 C40 18.5 24 18.5 22 24 Z" fill={hair} />}
        {female && <path d="M21 28 C19 14 45 13 43 28 C41 21 36 18.5 31 19 C26 19.5 23 23 21 28 Z" fill={hair} />}
        {/* 目・口 */}
        <circle cx="28.2" cy="28" r="1.1" fill="#2B2420" />
        <circle cx="35.8" cy="28" r="1.1" fill="#2B2420" />
        <path d="M29.5 33 Q32 35 34.5 33" stroke="#8B5A44" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </g>
      <circle cx="32" cy="32" r="31" fill="none" stroke={dim ? "#D1D5DB" : "#C9A84C"} strokeWidth="2" />
    </svg>
  );
}
