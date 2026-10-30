-- ① 「絶対にやらないこと」→「やらないと決めていること」（題名・見出し・他ページからの参照）
-- ② ホテル経由の料金 ¥16,000 → ¥18,000（サービスと料金／文章・表現のルール／出張パーソナルの準備）
-- 2026-10-30 尚樹の指示。何回流しても同じ結果。

update public.wiki_pages
   set title = 'やらないと決めていること',
       content = replace(content, '# 絶対にやらないこと', '# やらないと決めていること'),
       updated_at = now()
 where slug = 'never-do'
   and (title <> 'やらないと決めていること' or content like '%# 絶対にやらないこと%');

update public.wiki_pages
   set content = replace(content, '「絶対にやらないこと」', '「やらないと決めていること」'),
       updated_at = now()
 where content like '%「絶対にやらないこと」%';

update public.wiki_pages
   set content = replace(content, '¥16,000', '¥18,000'),
       updated_at = now()
 where content like '%¥16,000%';

-- 確認用：どちらも 0 件なら成功
select (select count(*) from public.wiki_pages where content like '%絶対にやらないこと%' or title like '%絶対に%') as 旧題名の残り,
       (select count(*) from public.wiki_pages where content like '%16,000%') as 旧料金の残り;
