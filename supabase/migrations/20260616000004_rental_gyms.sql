-- レンタルジムマスタ（名前・住所・料金）。レッスンの場所がレンタルジムの場合、
-- 利益計算でレンタルジム代を差し引く。レッスンには利用ジムとその回の料金を保持する。
create table if not exists public.rental_gyms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  fee         integer not null default 0 check (fee >= 0),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- レッスンの利用レンタルジムと、その回のレンタルジム代（マスタ値がデフォルト・変更可）
alter table public.lessons add column if not exists rental_gym_id  uuid references public.rental_gyms(id);
alter table public.lessons add column if not exists rental_gym_fee integer;
create index if not exists idx_lessons_rental_gym on public.lessons (rental_gym_id);
