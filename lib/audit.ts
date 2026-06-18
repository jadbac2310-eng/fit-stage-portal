import { getCurrentMember } from "./members";

/** 現在ログイン中の担当者ID（記録用）。未ログインなら undefined。 */
export async function currentMemberId(): Promise<string | undefined> {
  return (await getCurrentMember())?.id;
}

/** created_by / updated_by 列が未適用（マイグレーション前）であることに起因するエラーか */
export function isMissingAuthorColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return /created_by|updated_by/i.test(err.message ?? "")
    || ["42703", "PGRST204", "PGRST200"].includes(err.code ?? "");
}
