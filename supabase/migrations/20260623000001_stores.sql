-- 店舗マスタ（自社/提携の店舗）。レンタルジムとは別概念。利用料は一律2000円が既定。
-- レッスンの場所が店舗の場合、利益計算で店舗利用料を差し引く（レンタルジムと同様の扱い）。
create table if not exists public.stores (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  fee         integer not null default 2000 check (fee >= 0),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- レッスンの利用店舗と、その回の店舗利用料（マスタ値=既定2000・変更可）
alter table public.lessons add column if not exists store_id  uuid references public.stores(id);
alter table public.lessons add column if not exists store_fee integer;
create index if not exists idx_lessons_store on public.lessons (store_id);
