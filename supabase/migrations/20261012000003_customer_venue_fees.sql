-- 顧客ごとの会場の利用料（マスタの料金の上書き）。
--
-- 同じ会場でもお客さんによって料金が違うことがある
-- （FCT豊中千里店は通常4,200円だが、一部のお客さんは60分4,100円）。
-- レッスンを追加するたびに手で打ち直さなくていいように、組み合わせで覚えておく。
--
-- venue_kind … 'gym'（レンタルジム） / 'fct'（FCT店舗） / 'avenir'（アヴニール店舗）
-- venue_id   … それぞれのマスタの id。参照先テーブルが3つに分かれるので外部キーは張らない。
--              マスタから消えた会場の行は、画面側で名前が引けないので無視される。
create table if not exists public.customer_venue_fees (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  venue_kind  text not null check (venue_kind in ('gym', 'fct', 'avenir')),
  venue_id    uuid not null,
  fee         integer not null check (fee >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (customer_id, venue_kind, venue_id)
);

create index if not exists customer_venue_fees_customer_idx
  on public.customer_venue_fees (customer_id);
