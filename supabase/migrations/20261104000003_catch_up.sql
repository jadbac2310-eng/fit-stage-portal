-- 2026-11-04 の DB変更をまとめて1本に。下の2本と同じ中身。何回流しても安全。
--   20261104000001_wiki_store_line_link.sql（ハンドブックの店舗用LINEリンク差し替え）
--   20261104000002_enable_rls_all_public_tables.sql（全テーブルでRLSを有効に。Supabaseの警告対応）

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

-- ハンドブックの店舗用LINEリンクを新しいアカウントに差し替える（2026-11-04）。
-- 旧 https://lin.ee/s51ZtCp の先（@963ffknw）がLINE側で見つからなくなったため。
-- 新 https://lin.ee/XkPbVRr（@372zzede「FIT STAGE / パーソナルジム」）。HPも同日に差し替え済み。
-- 何回流しても同じ結果。

update public.wiki_pages
   set content = replace(content, 'https://lin.ee/s51ZtCp', 'https://lin.ee/XkPbVRr'),
       updated_at = now()
 where content like '%lin.ee/s51ZtCp%';

-- 確認用：旧リンク 0 件、新リンク 1 件以上
select
  (select count(*) from public.wiki_pages where content like '%lin.ee/s51ZtCp%') as 旧リンクの残り,
  (select count(*) from public.wiki_pages where content like '%lin.ee/XkPbVRr%') as 新リンクのページ数;
