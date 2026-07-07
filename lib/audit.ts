import { getCurrentMember } from "./members";

/** 現在ログイン中の担当者ID（記録用）。未ログインなら undefined。 */
export async function currentMemberId(): Promise<string | undefined> {
  return (await getCurrentMember())?.id;
}

/**
 * created_by / updated_by 列や、その members への JOIN 関連が解決できないエラーか。
 * SELECT の JOIN 失敗(PGRST200)はメッセージに列名が出ないことがあるためコードでも判定する。
 * ※ このフラグでフォールバックする側は、重要なデータ列を落とさないよう注意すること
 *   （lessons の書き込みは JOIN 非依存に分離済み）。
 */
export function isMissingAuthorColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return /created_by|updated_by/i.test(err.message ?? "")
    || ["42703", "PGRST204", "PGRST200"].includes(err.code ?? "");
}
