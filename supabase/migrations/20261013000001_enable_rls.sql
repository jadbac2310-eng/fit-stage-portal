-- public スキーマの全テーブルで行レベルセキュリティ(RLS)を有効にする。
--
-- Supabaseは public のテーブルを、公開キー（NEXT_PUBLIC_..._PUBLISHABLE_KEY）だけで
-- 外から読み書きできるようにしている。RLSが無効だと、そのキーを持っている人なら
-- 顧客の氏名・メール・電話や売上・歩合まで、アプリを通さず直接読めてしまう。
--
-- このポータルはデータの読み書きをすべて service role キー（RLSを通らない）で行い、
-- 公開キーはログイン処理（auth）にしか使っていない。
-- したがってRLSを有効にしても、ポリシーを1つも作らなくてもアプリの動作は変わらない。
-- 「外からの直接アクセスだけを閉じる」ことになる。
--
-- 何度流しても同じ結果になる（すでに有効なテーブルは変化なし）。
do $$
declare t record;
begin
  for t in
    select c.relname
    from   pg_class c
    join   pg_namespace n on n.oid = c.relnamespace
    where  n.nspname = 'public'
      and  c.relkind = 'r'          -- 通常のテーブルだけ（ビュー等は対象外）
      and  not c.relrowsecurity     -- まだ無効なものだけ
  loop
    execute format('alter table public.%I enable row level security', t.relname);
    raise notice 'RLSを有効にしました: %', t.relname;
  end loop;
end $$;
