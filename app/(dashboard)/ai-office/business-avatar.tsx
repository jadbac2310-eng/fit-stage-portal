/**
 * AI部署の担当者のアバター（2026-11-16 ビジネスマン風 → 2026-11-17 尚樹「もっとリアルに、おもしろく」で描き直し）。
 *
 * スーツ姿の上半身のイラスト。外から画像を読まない（軽さ優先・SVG だけ）。
 * 髪型・眉・めがね・ひげ・帽子・服の色で、人を描き分ける。実在の人物には似せない（あだ名として名前を借りているだけ）。
 */
export type AvatarLook = {
  hair: "short" | "side" | "back" | "curly" | "bald" | "bob";
  hairColor?: string;
  /** ネクタイの色（無ければ襟を開けたシャツ） */
  accent?: string;
  suit?: string;
  /** 背景の色（部署の色） */
  bg?: string;
  glasses?: "round" | "square" | "dark";
  beard?: "full" | "stubble" | "mustache";
  cap?: string;
  brow?: "calm" | "stern" | "up";
  mouth?: "smile" | "grin" | "flat";
  skin?: string;
};

export function BusinessAvatar({ look, size = 72, dim = false, title }: { look: AvatarLook; size?: number; dim?: boolean; title?: string }) {
  const gray = (c: string) => (dim ? "#C4C8CE" : c);
  const skin = dim ? "#E5E7EB" : look.skin ?? "#F2D2BA";
  const skinShade = dim ? "#D6D9DE" : "#E3B597";
  const hair = gray(look.hairColor ?? "#2B2420");
  const suit = gray(look.suit ?? "#17284B");
  const lapel = dim ? "#AEB3BA" : "#0B1426";
  const bg = dim ? "#F3F4F6" : look.bg ?? "#E8ECF4";
  const ink = dim ? "#9CA3AF" : "#2B2420";
  const id = `av-${look.hair}-${(look.accent ?? "n").replace(/[^0-9a-z]/gi, "")}-${(look.bg ?? "b").replace(/[^0-9a-z]/gi, "")}${dim ? "-d" : ""}`;

  const brow = look.brow ?? "calm";
  const browL = brow === "stern" ? "M30.5 27.5 L37 29.5" : brow === "up" ? "M30.5 28.5 Q33.5 25.5 37 27.5" : "M30.5 28.5 Q33.5 26.8 37 28.3";
  const browR = brow === "stern" ? "M49.5 27.5 L43 29.5" : brow === "up" ? "M49.5 28.5 Q46.5 25.5 43 27.5" : "M49.5 28.5 Q46.5 26.8 43 28.3";
  const mouth = look.mouth ?? "smile";

  return (
    <svg width={size} height={size} viewBox="0 0 80 80" role="img" aria-label={title ?? "AIの担当者"} className="flex-shrink-0">
      <defs>
        <clipPath id={id}><circle cx="40" cy="40" r="40" /></clipPath>
      </defs>
      <circle cx="40" cy="40" r="40" fill={bg} />
      <g clipPath={`url(#${id})`}>
        {/* 後ろ髪（ボブ） */}
        {look.hair === "bob" && <path d="M24 32 C22 14 58 14 56 32 L57 48 L23 48 Z" fill={hair} />}
        {/* 体：スーツ */}
        <path d="M8 80 C9 64 20 56 31 54 L40 64 L49 54 C60 56 71 64 72 80 Z" fill={suit} />
        {/* シャツ */}
        <path d="M31 54 L40 64 L49 54 L46 51.5 L40 57 L34 51.5 Z" fill={dim ? "#F3F4F6" : "#FFFFFF"} />
        {look.accent ? (
          <>
            <path d="M38.2 56.5 L41.8 56.5 L41 59.5 L39 59.5 Z" fill={gray(look.accent)} />
            <path d="M39 59.5 L41 59.5 L43 71 L40 75 L37 71 Z" fill={gray(look.accent)} />
          </>
        ) : (
          // ネクタイ無し（襟を開けたシャツ）
          <path d="M36.5 53 L40 59 L43.5 53" stroke={dim ? "#D1D5DB" : "#DCE1E8"} strokeWidth="1.2" fill="none" />
        )}
        {/* 襟（ラペル） */}
        <path d="M31 54 L27 58 L37 73 L40 64 Z" fill={lapel} opacity="0.55" />
        <path d="M49 54 L53 58 L43 73 L40 64 Z" fill={lapel} opacity="0.55" />
        {/* 胸ポケットのチーフ */}
        {!dim && <path d="M52 63 L57 62.2 L56.5 64.2 Z" fill="#FFFFFF" opacity="0.9" />}

        {/* 首 */}
        <path d="M35 44 L45 44 L45.5 54 L40 57 L34.5 54 Z" fill={skin} />
        <path d="M35 47 Q40 51 45 47 L45 49.5 Q40 53 35 49.5 Z" fill={skinShade} opacity="0.7" />
        {/* 耳 */}
        <ellipse cx="26.5" cy="34" rx="2.4" ry="3.6" fill={skin} />
        <ellipse cx="53.5" cy="34" rx="2.4" ry="3.6" fill={skin} />
        {/* 顔 */}
        <path d="M27 31 C27 19 53 19 53 31 L53 35 C53 44 47 49.5 40 49.5 C33 49.5 27 44 27 35 Z" fill={skin} />

        {/* ひげ */}
        {look.beard === "full" && <path d="M27.5 35 C28 45 33 50 40 50 C47 50 52 45 52.5 35 C51 41 47 43.5 40 43.5 C33 43.5 29 41 27.5 35 Z" fill={hair} opacity="0.9" />}
        {look.beard === "stubble" && <path d="M28 37 C29 45 34 49 40 49 C46 49 51 45 52 37 C50 42 46 44.5 40 44.5 C34 44.5 30 42 28 37 Z" fill={hair} opacity="0.22" />}
        {(look.beard === "mustache" || look.beard === "full") && <path d="M35 41.6 Q40 39.6 45 41.6 Q40 42.8 35 41.6 Z" fill={hair} />}

        {/* 髪 */}
        {look.hair === "short" && <path d="M26.5 30 C25 15 55 14 53.5 30 C51 23 46 21.5 40 21.5 C34 21.5 29 23 26.5 30 Z" fill={hair} />}
        {look.hair === "side" && <path d="M26.5 31 C24 14 56 13 53.5 30 C50 24 42 25 34 21 C31 24.5 28.5 27 26.5 31 Z" fill={hair} />}
        {look.hair === "back" && <path d="M27 28 C27 16 53 16 53 28 C50 21.5 30 21.5 27 28 Z" fill={hair} />}
        {look.hair === "curly" && (
          <g fill={hair}>
            <path d="M26 31 C23 16 57 15 54 31 C52 24 47 22 40 22 C33 22 28 24 26 31 Z" />
            {[[29, 21], [34, 18], [40, 17], [46, 18], [51, 21], [27, 26], [53, 26]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.6" />)}
          </g>
        )}
        {look.hair === "bald" && <path d="M26.5 33 C26 28 27.5 26 29 25.5 L29.5 33 Z M53.5 33 C54 28 52.5 26 51 25.5 L50.5 33 Z" fill={hair} />}
        {look.hair === "bob" && <path d="M25 33 C23 15 57 14 55 33 C52 25 46 21 40 21.5 C33 22 28 26 25 33 Z" fill={hair} />}

        {/* 帽子（監督のキャップ） */}
        {look.cap && (
          <g>
            <path d="M25.5 27 C25.5 13 54.5 13 54.5 27 Z" fill={gray(look.cap)} />
            <path d="M25 27 L61 27 Q58 30.5 51 30 L25 29.5 Z" fill={gray(look.cap)} />
            <path d="M25 27 L61 27" stroke={dim ? "#9CA3AF" : "#0B1426"} strokeWidth="0.8" opacity="0.6" />
            {!dim && <text x="40" y="23.5" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#C9A84C" fontFamily="sans-serif">FS</text>}
          </g>
        )}

        {/* 眉 */}
        <path d={browL} stroke={hair} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d={browR} stroke={hair} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        {/* 目 */}
        {look.glasses === "dark" ? null : (
          <g>
            <ellipse cx="34" cy="32.6" rx="2.3" ry="1.6" fill="#FFFFFF" />
            <ellipse cx="46" cy="32.6" rx="2.3" ry="1.6" fill="#FFFFFF" />
            <circle cx="34.4" cy="32.7" r="1.25" fill={ink} />
            <circle cx="46.4" cy="32.7" r="1.25" fill={ink} />
          </g>
        )}
        {/* めがね */}
        {look.glasses === "round" && (
          <g stroke={dim ? "#9CA3AF" : "#3A2E26"} strokeWidth="1.2" fill="none">
            <circle cx="34" cy="32.8" r="4.2" /><circle cx="46" cy="32.8" r="4.2" /><path d="M38.2 32.5 Q40 31.4 41.8 32.5" />
          </g>
        )}
        {look.glasses === "square" && (
          <g stroke={dim ? "#9CA3AF" : "#1F1A17"} strokeWidth="1.5" fill="none">
            <rect x="29.3" y="29.6" width="9.2" height="6.4" rx="1.2" /><rect x="41.5" y="29.6" width="9.2" height="6.4" rx="1.2" /><path d="M38.5 32 L41.5 32" />
          </g>
        )}
        {look.glasses === "dark" && (
          <g>
            <rect x="29.3" y="29.8" width="9.4" height="6" rx="1.6" fill={dim ? "#9CA3AF" : "#1B1B1F"} />
            <rect x="41.3" y="29.8" width="9.4" height="6" rx="1.6" fill={dim ? "#9CA3AF" : "#1B1B1F"} />
            <path d="M38.7 32 L41.3 32" stroke={dim ? "#9CA3AF" : "#1B1B1F"} strokeWidth="1.4" />
            {!dim && <path d="M30.8 31 L33 31" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />}
          </g>
        )}
        {/* 鼻 */}
        <path d="M40.3 33.5 Q38.6 38 40.8 38.6" stroke={skinShade} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {/* ほお */}
        {!dim && <><circle cx="31.5" cy="39" r="2.3" fill="#F28C8C" opacity="0.18" /><circle cx="48.5" cy="39" r="2.3" fill="#F28C8C" opacity="0.18" /></>}
        {/* 口 */}
        {mouth === "smile" && <path d="M36 43.2 Q40 46.2 44 43.2" stroke="#8B4A3C" strokeWidth="1.3" fill="none" strokeLinecap="round" />}
        {mouth === "grin" && <path d="M35.5 42.6 Q40 48 44.5 42.6 Z" fill="#8B4A3C" />}
        {mouth === "grin" && <path d="M36.6 43.1 L43.4 43.1 L43 44 L37 44 Z" fill="#FFFFFF" />}
        {mouth === "flat" && <path d="M36.5 44 L43.5 44" stroke="#8B4A3C" strokeWidth="1.3" strokeLinecap="round" />}
      </g>
      <circle cx="40" cy="40" r="39" fill="none" stroke={dim ? "#D1D5DB" : "#C9A84C"} strokeWidth="2" />
    </svg>
  );
}
