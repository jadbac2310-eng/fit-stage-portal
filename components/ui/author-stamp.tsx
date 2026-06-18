import { UserRound, PencilLine } from "lucide-react";

function fmt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * トラン系データの作成者・編集者を日時付きで表示する。
 * 編集者は記録がある場合（一度でも編集された場合）のみ表示する。
 */
export function AuthorStamp({
  createdByName, createdAt, updatedByName, updatedAt, className,
}: {
  createdByName?: string;
  createdAt?: string;
  updatedByName?: string;
  updatedAt?: string;
  className?: string;
}) {
  if (!createdAt && !createdByName && !updatedByName) return null;
  return (
    <div className={["flex flex-col gap-0.5 text-[10px] text-gray-400", className].filter(Boolean).join(" ")}>
      <span className="flex items-center gap-1">
        <UserRound size={9} className="flex-shrink-0" />
        作成: {createdByName ?? "—"}{createdAt ? `（${fmt(createdAt)}）` : ""}
      </span>
      {updatedByName && (
        <span className="flex items-center gap-1">
          <PencilLine size={9} className="flex-shrink-0" />
          編集: {updatedByName}{updatedAt ? `（${fmt(updatedAt)}）` : ""}
        </span>
      )}
    </div>
  );
}
