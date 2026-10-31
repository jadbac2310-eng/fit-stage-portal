-- ハンドブック：入会金を「現在 0円」→「現在 ¥5,500」に（HPも同日に変更済み）
-- 2026-11-01 尚樹の指示。何回流しても同じ結果。

update public.wiki_pages
   set content = replace(replace(content, '通常 ¥11,000 → 現在 0円', '通常 ¥11,000 → 現在 ¥5,500'),
                                 '入会金は現在 0円。', '入会金は通常 ¥11,000 のところ、現在 ¥5,500。'),
       updated_at = now()
 where content like '%現在 0円%';

-- 確認：残っていれば 0 件になる
select slug, title from public.wiki_pages where content like '%現在 0円%';
