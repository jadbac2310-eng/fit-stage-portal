-- 庄内店の1回あたりの利用料を 2,500円 → 2,250円 にする（2026-10-28 から）。
--
-- ・店舗マスタ（stores.fee）を 2250 に。これから登録するレッスンはこの値が入る
-- ・すでに登録してある 10/28 以降のレッスン・体験で、2,500円のままのものを 2,250円 に直す
-- ・10/27 までのレッスンは 2,500円のまま（実際にその金額がかかっているため）
-- ・曽根城山店は触らない（2,500円のまま）
--
-- 何回流しても同じ結果になる。

-- ① 店舗マスタ
update public.stores
   set fee = 2250, updated_at = now()
 where name like '%庄内%'
   and fee is distinct from 2250;

-- ② 10/28（日本時間）以降のレッスン
update public.lessons l
   set store_fee = 2250, updated_at = now()
  from public.stores s
 where l.store_id = s.id
   and s.name like '%庄内%'
   and l.scheduled_at >= timestamptz '2026-10-28 00:00:00+09'
   and l.store_fee = 2500;

-- ③ 10/28（日本時間）以降の体験レッスン
update public.trial_lessons t
   set store_fee = 2250, updated_at = now()
  from public.stores s
 where t.store_id = s.id
   and s.name like '%庄内%'
   and t.scheduled_at >= timestamptz '2026-10-28 00:00:00+09'
   and t.store_fee = 2500;

-- 確認用：庄内店の 10/27 以前と 10/28 以降で、利用料ごとの件数
select case when l.scheduled_at < timestamptz '2026-10-28 00:00:00+09' then '10/27まで' else '10/28から' end as 期間,
       l.store_fee as 利用料, count(*) as 件数
  from public.lessons l
  join public.stores s on s.id = l.store_id
 where s.name like '%庄内%'
 group by 1, 2
 order by 1, 2;
