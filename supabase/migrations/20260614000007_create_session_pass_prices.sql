-- 回数券の標準金額マスタ（人数 × 回数 → 金額）。プランマスタの回数券版。
-- 顧客ごとに金額が異なる場合は購入時に上書き可能。ここで管理するのは標準（初期）金額。
create table if not exists public.session_pass_prices (
  id           uuid primary key default gen_random_uuid(),
  person_count smallint not null check (person_count > 0),
  total_count  integer  not null check (total_count > 0),
  amount       integer  not null check (amount >= 0),
  sort_order   integer  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (person_count, total_count)
);

-- 既存のハードコーディング値（plans-client.tsx の SESSION_PASS_PRICE）を初期値として投入
insert into public.session_pass_prices (person_count, total_count, amount, sort_order) values
  (1,  8,  76800, 1),
  (1, 16, 148800, 2),
  (1, 32, 288000, 3),
  (2,  8, 102400, 4),
  (2, 16, 198400, 5),
  (2, 32, 384000, 6)
on conflict (person_count, total_count) do nothing;
