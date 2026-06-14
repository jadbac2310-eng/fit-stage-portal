-- プランマスタ：各コースの標準金額を一元管理（ハードコーディング解消）
-- amount の意味: monthly=月額総額 / session_pass・single=1回あたり単価
-- 1回単価 = round(amount / sessions)
create table if not exists public.plans (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  payment_type text not null check (payment_type in ('monthly', 'session_pass', 'single')),
  sessions     integer not null check (sessions > 0),
  amount       integer not null check (amount >= 0),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 既存のハードコーディング値（lib/commissions-types.ts の LESSON_PRICE）を初期値として投入
insert into public.plans (name, payment_type, sessions, amount, sort_order) values
  ('月2回', 'monthly',      2, 18700, 1),
  ('月4回', 'monthly',      4, 36400, 2),
  ('月8回', 'monthly',      8, 74800, 3),
  ('回数券', 'session_pass', 1,  9300, 4),
  ('都度',  'single',       1,  9900, 5)
on conflict (name) do nothing;
