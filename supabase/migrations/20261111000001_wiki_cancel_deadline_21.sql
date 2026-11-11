-- ハンドブック：キャンセル規定を「前日24時まで無料」→「前日21時まで無料」に（HPも同日に変更済み）
-- 2026-11-11 尚樹の指示。何回流しても同じ結果。
-- ポータルのレッスンの状況「当日キャンセル」は名前を変えず、「前日21時を過ぎてからのキャンセル」もここで記録する。

update public.wiki_pages
   set content = replace(
                   replace(content,
                     '| それ以降（当日キャンセル） | 回数券1回分を消化 |',
                     '| それ以降（前日21時を過ぎてから・当日） | 回数券1回分を消化。ポータルでは「当日キャンセル」で記録 |'),
                   '前日24時', '前日21時'),
       updated_at = now()
 where content like '%前日24時%'
    or content like '%| それ以降（当日キャンセル） |%';

-- 確認：残っていれば 0 件になる
select slug, title from public.wiki_pages where content like '%前日24時%';

-- 確認：直ったページ（「前日21時」を含むページ）
select slug, title from public.wiki_pages where content like '%前日21時%';
