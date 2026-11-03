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
