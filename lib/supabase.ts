import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Session-aware client for server components, route handlers, server actions
export async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component からの呼び出しではクッキーの書き込みは無視される
          }
        },
      },
    }
  );
}

// Admin client for DB + Auth Admin API (service role, bypasses RLS)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// Supabase の API は 1回のリクエストで最大1000行までしか返さない。
// 1000行を超えても「エラーは出ず、古いぶんが黙って消える」ので、
// レッスンや入金が増えてくると売上・請求・歩合の合計が静かに合わなくなる。
// そうならないように、1000行ずつ最後まで読み切る。
export const ROWS_PER_PAGE = 1000;
// 無限ループの保険（20万行）。実データでここに当たることはない
const MAX_PAGES = 200;

type PageResult<T> = { data: T[] | null; error: PostgrestError | null };

/**
 * テーブル全件を 1000 行ずつ読み切る。
 *
 * ※ 並び順は必ず最後に id を足して一意に決めること。
 *    同じ日付で並べているだけだと、ページの境目で同じ行が二重に来たり抜けたりする。
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<PageResult<T>> {
  const all: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const from = i * ROWS_PER_PAGE;
    const { data, error } = await page(from, from + ROWS_PER_PAGE - 1);
    if (error) return { data: null, error };
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < ROWS_PER_PAGE) break;
  }
  return { data: all, error: null };
}
