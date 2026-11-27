-- 庄内店・曽根城山店の1回あたりの利用料を 2,250円 → 2,100円 にする（2026-11-27 から。尚樹）。
-- 前回（20261028000001 庄内・20261103000001 曽根）と同じやり方。
--
-- ・店舗マスタ（stores.fee）を 2100 に。これから登録するレッスン・体験はこの値が入る
-- ・すでに登録してある 11/27 以降のレッスン・体験で、2,250円のままのものを 2,100円 に直す
-- ・11/26 までの分は 2,250円のまま（実際にその金額がかかっているため）
--
-- 何回流しても同じ結果になる。

-- ① 店舗マスタ
update public.stores
   set fee = 2100, updated_at = now()
 where (name like '%庄内%' or name like '%曽根%')
   and fee is distinct from 2100;

-- ② 11/27（日本時間）以降のレッスン
update public.lessons l
   set store_fee = 2100, updated_at = now()
  from public.stores s
 where l.store_id = s.id
   and (s.name like '%庄内%' or s.name like '%曽根%')
   and l.scheduled_at >= timestamptz '2026-11-27 00:00:00+09'
   and l.store_fee = 2250;

-- ③ 11/27（日本時間）以降の体験レッスン
update public.trial_lessons t
   set store_fee = 2100, updated_at = now()
  from public.stores s
 where t.store_id = s.id
   and (s.name like '%庄内%' or s.name like '%曽根%')
   and t.scheduled_at >= timestamptz '2026-11-27 00:00:00+09'
   and t.store_fee = 2250;

-- 確認用：店舗ごとに、11/26 まで と 11/27 から の利用料ごとの件数（11/27から は 2100 だけなら OK）
select s.name as 店舗,
       case when l.scheduled_at < timestamptz '2026-11-27 00:00:00+09' then '11/26まで' else '11/27から' end as 期間,
       l.store_fee as 利用料, count(*) as 件数
  from public.lessons l
  join public.stores s on s.id = l.store_id
 where (s.name like '%庄内%' or s.name like '%曽根%')
   and l.scheduled_at >= timestamptz '2026-10-01 00:00:00+09'
 group by 1, 2, 3
 order by 1, 2, 3;
