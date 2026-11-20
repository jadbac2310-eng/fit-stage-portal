-- ハンドブック「FIT STAGE のビジョン」の「私たちらしさ」を2か所直す（2026-11-20 尚樹）。何回流しても同じ結果。
-- ① 「指名制、指名料なし。」→「指名料なし。」（「指名制は消して。指名料0はok」）
-- ② 「場所が変わっても担当は変わらない。」→ 担当は変わることもある。裏で情報を共有していて、担当するトレーナーは全員お客さまのことを把握している
update public.wiki_pages
   set content    = replace(
                      replace(content, '**指名制、指名料なし。**', '**指名料なし。**'),
                      '**場所が変わっても担当は変わらない。** 店舗でも出張でも、同じトレーナーが見る',
                      '**担当が変わっても、お客さまのことは全員が知っている。** トレーナー同士で情報を共有しているので、誰が担当してもお客さまのことを分かったうえで見る'),
       updated_at = now()
 where slug = 'vision'
   and (content like '%**指名制、指名料なし。**%' or content like '%**場所が変わっても担当は変わらない。**%');

-- 確認：どちらも 0 なら OK
select
  count(*) filter (where content like '%指名制%')                 as "指名制が残っている",
  count(*) filter (where content like '%担当は変わらない%')       as "担当は変わらないが残っている"
from public.wiki_pages;
