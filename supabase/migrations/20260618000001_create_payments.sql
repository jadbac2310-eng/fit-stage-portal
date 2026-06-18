-- 入金管理（入金台帳）。売上になる各項目（回数券・月額プラン・都度払い）に対し
-- 入金されたかどうかと入金明細（入金日・金額・方法・メモ）を保持する。
-- 行が存在＝入金済み、無い＝未入金。1売上項目につき1行（source_type + source_id で一意）。
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  source_type  text not null,                                  -- session_pass | customer_plan | single_lesson
  source_id    uuid not null,                                  -- 対象（回数券/プラン/都度レッスン）のID
  customer_id  uuid references public.customers(id) on delete set null,
  amount       integer not null default 0,                     -- 入金額（円）
  paid_at      date,                                           -- 入金日
  method       text,                                           -- 現金 / 振込 / カード / その他
  note         text,
  created_by   uuid references public.members(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (source_type, source_id)
);

create index if not exists idx_payments_customer on public.payments (customer_id);
create index if not exists idx_payments_paid_at  on public.payments (paid_at);
