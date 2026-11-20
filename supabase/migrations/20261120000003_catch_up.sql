-- 2026-11-20 のハンドブックの直し、まとめて1本（何回流しても同じ結果）
-- 20261120000001_wiki_remove_shimeisei.sql ＋ 20261120000002_wiki_three_years_onsite.sql

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


-- ハンドブック「3年後の FIT STAGE」に出張パーソナルも増やすことを書く（2026-11-20 尚樹「出張パーソナルも増やすからね」）。何回流しても同じ結果。
update public.wiki_pages
   set content = replace(
                   replace(content,
                     E'| 店舗 | 3店舗 | **10店舗** |\n',
                     E'| 店舗 | 3店舗 | **10店舗** |\n| 出張パーソナル | 大阪・兵庫・京都へ伺う | **もっと増やす**（店舗のない街へも、ご自宅・ホテル・オフィスへ） |\n'),
                   E'1店舗20人の方が通い続けてくれていれば、その店は自立できる。それを10店舗。\n',
                   E'1店舗20人の方が通い続けてくれていれば、その店は自立できる。それを10店舗。\n店舗のない街や、ご自宅・ホテル・オフィスには、**出張パーソナル**で届けます。店舗と出張の両方を増やしていきます。\n'),
       updated_at = now()
 where slug = 'three-years'
   and content not like '%| 出張パーソナル |%';

-- 確認：左の2つが 0、右が 1 なら OK
select
  count(*) filter (where content like '%指名制%')                                   as "指名制が残っている",
  count(*) filter (where content like '%担当は変わらない%')                         as "担当は変わらないが残っている",
  count(*) filter (where slug = 'three-years' and content like '%| 出張パーソナル |%') as "3年後に出張の行がある"
from public.wiki_pages;
