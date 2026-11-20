-- ハンドブック「FIT STAGE のビジョン」の「私たちらしさ」から「指名制」を消す（2026-11-20 尚樹「指名制は消して。指名料0はok」）。
-- 「指名制、指名料なし。」→「指名料なし。」。何回流しても同じ結果（2回目以降は何も変わらない）。
update public.wiki_pages
   set content    = replace(content, '**指名制、指名料なし。**', '**指名料なし。**'),
       updated_at = now()
 where slug = 'vision'
   and content like '%**指名制、指名料なし。**%';

-- 確認：残り 0 なら OK
select count(*) as "指名制が残っているページ" from public.wiki_pages where content like '%指名制%';
