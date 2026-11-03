-- 曽根城山店の1回あたりの利用料を 2,500円 → 2,250円 にする（2026-11-03 から）。
-- 庄内店（20261028000001）と同じやり方。
--
-- ・店舗マスタ（stores.fee）を 2250 に。これから登録するレッスンはこの値が入る
-- ・すでに登録してある 11/3 以降のレッスン・体験で、2,500円のままのものを 2,250円 に直す
-- ・11/2 までのレッスンは 2,500円のまま（実際にその金額がかかっているため）
--
-- 何回流しても同じ結果になる。

-- ① 店舗マスタ
update public.stores
   set fee = 2250, updated_at = now()
 where name like '%曽根%'
   and fee is distinct from 2250;

-- ② 11/3（日本時間）以降のレッスン
update public.lessons l
   set store_fee = 2250, updated_at = now()
  from public.stores s
 where l.store_id = s.id
   and s.name like '%曽根%'
   and l.scheduled_at >= timestamptz '2026-11-03 00:00:00+09'
   and l.store_fee = 2500;

-- ③ 11/3（日本時間）以降の体験レッスン
update public.trial_lessons t
   set store_fee = 2250, updated_at = now()
  from public.stores s
 where t.store_id = s.id
   and s.name like '%曽根%'
   and t.scheduled_at >= timestamptz '2026-11-03 00:00:00+09'
   and t.store_fee = 2500;

-- 確認用：曽根城山店の 11/2 以前と 11/3 以降で、利用料ごとの件数
select case when l.scheduled_at < timestamptz '2026-11-03 00:00:00+09' then '11/2まで' else '11/3から' end as 期間,
       l.store_fee as 利用料, count(*) as 件数
  from public.lessons l
  join public.stores s on s.id = l.store_id
 where s.name like '%曽根%'
 group by 1, 2
 order by 1, 2;
