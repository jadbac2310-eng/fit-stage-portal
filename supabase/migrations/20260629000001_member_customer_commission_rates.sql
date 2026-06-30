-- 担当者×顧客の組み合わせごとのトレーナー歩合率（％）。
-- 組み合わせの設定が無いときは既定の50%を使う。
create table if not exists public.member_customer_commission_rates (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id)   on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  rate        integer not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (member_id, customer_id)
);

create index if not exists member_customer_commission_rates_member_idx
  on public.member_customer_commission_rates (member_id);
