// 本番でサーバー側の実エラー全文をログに残す（本番はクライアント応答ではメッセージが隠されるため）。
// Vercel ダッシュボード → プロジェクト → Logs で "SERVER_ERROR" で検索すると全文が見られる。
export function onRequestError(
  err: unknown,
  request: { path?: string; method?: string },
  context: { routePath?: string; renderType?: string },
): void {
  const e = err as { name?: string; message?: string; stack?: string; digest?: string; code?: string; details?: string; hint?: string };
  // eslint-disable-next-line no-console
  console.error(
    "🔴 SERVER_ERROR " +
      JSON.stringify(
        {
          name: e?.name,
          message: e?.message,
          code: e?.code,
          details: e?.details,
          hint: e?.hint,
          digest: e?.digest,
          path: request?.path,
          method: request?.method,
          routePath: context?.routePath,
          renderType: context?.renderType,
          stack: e?.stack,
        },
        null,
        2,
      ),
  );
}
