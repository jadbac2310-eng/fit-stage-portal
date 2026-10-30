-- ビジョン・ルールの各ページ末尾の注釈から「…このページを編集してください。」の文を消す
-- （「まとめたものです」だけ残す。尚樹の指示 2026-10-30）。何回流しても同じ結果。

update public.wiki_pages
   set content = replace(content, '言い回しを変えたいところは、このページを編集してください。', ''),
       updated_at = now()
 where content like '%言い回しを変えたいところは、このページを編集してください。%';

update public.wiki_pages
   set content = replace(content, '直したいところは、このページを編集してください。', ''),
       updated_at = now()
 where content like '%直したいところは、このページを編集してください。%';

-- 確認用：残っていれば 0 件
select count(*) as 残り from public.wiki_pages where content like '%このページを編集してください%';
