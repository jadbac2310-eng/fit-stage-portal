-- ① 「絶対にやらないこと」→「守り続けること」（題名・見出し・他ページからの参照）
-- ② ホテル経由の料金 ¥16,000 → ¥18,000（サービスと料金／文章・表現のルール／出張パーソナルの準備）
-- 2026-10-30 尚樹の指示。何回流しても同じ結果。

update public.wiki_pages
   set title = '守り続けること',
       content = replace(content, '# 絶対にやらないこと', '# 守り続けること'),
       updated_at = now()
 where slug = 'never-do'
   and (title <> '守り続けること' or content like '%# 絶対にやらないこと%');

update public.wiki_pages
   set content = replace(content, '「絶対にやらないこと」', '「守り続けること」'),
       updated_at = now()
 where content like '%「絶対にやらないこと」%';

-- 前の版（やらないと決めていること）を流していた場合も直す
update public.wiki_pages
   set title = replace(title, 'やらないと決めていること', '守り続けること'),
       content = replace(content, 'やらないと決めていること', '守り続けること'),
       updated_at = now()
 where title like '%やらないと決めていること%' or content like '%やらないと決めていること%';

update public.wiki_pages
   set content = replace(content, '¥16,000', '¥18,000'),
       updated_at = now()
 where content like '%¥16,000%';

-- 確認用：どちらも 0 件なら成功
select (select count(*) from public.wiki_pages where content like '%絶対にやらないこと%' or content like '%やらないと決めていること%' or title like '%絶対に%' or title like '%やらないと%') as 旧題名の残り,
       (select count(*) from public.wiki_pages where content like '%16,000%') as 旧料金の残り;
