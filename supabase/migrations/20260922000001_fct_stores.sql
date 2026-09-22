-- FCT店舗マスタ（名前・住所・利用料）。レンタルジムと同じく、レッスンの場所が
-- FCT店舗の場合は利益計算で利用料を差し引く。
-- 店舗マスタ(stores)は利用料が無い別概念なので、テーブルを分けている。
create table if not exists public.fct_stores (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  fee         integer not null default 0 check (fee >= 0),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 通常レッスン・体験レッスンの利用FCT店舗と、その回の利用料（マスタ値がデフォルト・変更可）
alter table public.lessons       add column if not exists fct_store_id  uuid references public.fct_stores(id);
alter table public.lessons       add column if not exists fct_store_fee integer;
alter table public.trial_lessons add column if not exists fct_store_id  uuid references public.fct_stores(id);
alter table public.trial_lessons add column if not exists fct_store_fee integer;

create index if not exists idx_lessons_fct_store       on public.lessons (fct_store_id);
create index if not exists idx_trial_lessons_fct_store on public.trial_lessons (fct_store_id);
