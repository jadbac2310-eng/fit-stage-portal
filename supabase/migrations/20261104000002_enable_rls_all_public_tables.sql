-- public スキーマの全テーブルで RLS（行レベルセキュリティ）を有効にする（2026-11-04）。
--
-- Supabase から「Table publicly accessible（rls_disabled_in_public）」の警告が来たため。
-- RLS が切れているテーブルは、ブラウザに渡している公開キー（NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY）だけで
-- 誰でも読み書き・削除できてしまう（顧客の個人情報・売上など）。
--
-- ポータルのテーブル操作はすべて service role キー（lib/supabase.ts の createAdminClient）で行っていて、
-- service role は RLS を無視するので、有効にしてもポータルの動きは変わらない。
-- 公開キーを使っているのはログイン・ログアウト・LINEログインの認証だけで、テーブルは読んでいない（2026-11-04 確認）。
--
-- ポリシーは作らない＝公開キーからは何も見えない、が狙い。
-- 何回流しても同じ結果。新しいテーブルを作ったら、そのマイグレーションでも enable row level security を書くこと。

-- 確認用（前）：RLS が切れているテーブル
select tablename as RLSが切れていたテーブル
  from pg_tables
 where schemaname = 'public' and rowsecurity = false
 order by tablename;

do $$
declare r record;
begin
  for r in
    select tablename from pg_tables where schemaname = 'public' and rowsecurity = false
  loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- 確認用（後）：0 件になっていれば完了
select count(*) as まだ切れているテーブル
  from pg_tables
 where schemaname = 'public' and rowsecurity = false;
