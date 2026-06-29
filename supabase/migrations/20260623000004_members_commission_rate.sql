-- 担当者ごとのトレーナー歩合率（％）。null のときは既定の50%を使う。
alter table public.members add column if not exists commission_rate integer;
