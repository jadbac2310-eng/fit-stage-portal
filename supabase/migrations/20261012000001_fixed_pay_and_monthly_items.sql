-- ① 担当者×顧客の「1レッスンあたりの固定額」。
--
-- 京阪総合サービスのように、こちらの請求額とは切り離して
-- 「1レッスンにつき○円」でトレーナーに払う契約がある。
-- fixed_amount が入っていればそれを払い、入っていなければ従来どおり rate（％）で計算する。
alter table public.member_customer_commission_rates
  add column if not exists fixed_amount integer;

alter table public.member_customer_commission_rates
  drop constraint if exists member_customer_commission_rates_fixed_amount_check;
alter table public.member_customer_commission_rates
  add  constraint member_customer_commission_rates_fixed_amount_check
  check (fixed_amount is null or fixed_amount >= 0);

-- ② 顧客ごとの「毎月かかる固定の請求項目」。
--
-- ホームページ運用代行のように、レッスンとは別に毎月つける項目。
-- レッスン料と同じ請求書にまとめて載せる。
-- started_on / ended_on でいつからいつまで請求するかを決める（null はどちらも制限なし）。
create table if not exists public.customer_monthly_items (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name        text not null,
  amount      integer not null default 0 check (amount >= 0),
  started_on  date,
  ended_on    date,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists customer_monthly_items_customer_idx
  on public.customer_monthly_items (customer_id);
