/**
 * サーバーアクションのエラーを「戻り値」で返すための仕組み。
 *
 * Next.js は本番ビルドでサーバー側の例外メッセージを伏せる（画面には
 * "An error occurred in the Server Components render..." という定型文しか出ない）。
 * そのため「コースを選択してください」のような “ユーザーに見せたい文言” は
 * throw ではなくデータとして返す必要がある。
 * （Next.js のドキュメント「Error Handling / Server Functions」に準拠）
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * ユーザーにそのまま見せる想定内のエラー（入力不備・権限不足・残数不足など）。
 * これ以外の例外は想定外として扱い、中身を画面に出さない。
 */
export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

/** 想定外の例外のときに画面へ出す文言（原因はサーバーログに残す）。 */
function unexpectedMessage(e: unknown): string {
  // Supabase/PostgREST のエラーコードだけは添える（ログと突き合わせる手がかりになる）
  const code = (e as { code?: unknown } | null)?.code;
  const suffix = typeof code === "string" && code ? `（コード: ${code}）` : "";
  return `処理に失敗しました。時間をおいて試すか、管理者に連絡してください${suffix}`;
}

/**
 * サーバーアクションの本体を包み、例外を ActionResult に変換する。
 * 本体の中では今までどおり ActionError を throw してよい。
 */
export async function runAction(body: () => Promise<void>): Promise<ActionResult> {
  try {
    await body();
    return { ok: true };
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.message };
    console.error("[action]", e);
    return { ok: false, error: unexpectedMessage(e) };
  }
}

/**
 * クライアント側でサーバーアクションの結果を受けるヘルパー。
 * 失敗なら例外にして、呼び出し元の try/catch でそのままメッセージを表示させる。
 * 戻り値を見ずに握り潰すと失敗が無言になるため、アクションの呼び出しは必ずこれを通す。
 */
export function assertActionOk(result: ActionResult | void): void {
  if (result && result.ok === false) throw new Error(result.error);
}
