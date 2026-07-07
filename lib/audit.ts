import { getCurrentMember } from "./members";

/** 現在ログイン中の担当者ID（記録用）。未ログインなら undefined。 */
export async function currentMemberId(): Promise<string | undefined> {
  return (await getCurrentMember())?.id;
}

/**
 * created_by / updated_by 列が未適用（マイグレーション前）であることに起因するエラーか。
 * メッセージに列名が明示されている場合のみ真とする（コードだけでの判定は、無関係な一時エラーまで
 * 誤って「列がない」と扱ってしまい、created_by/updated_by を無言で欠落させる原因になるため避ける）。
 */
export function isMissingAuthorColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return /created_by|updated_by/i.test(err.message ?? "");
}
