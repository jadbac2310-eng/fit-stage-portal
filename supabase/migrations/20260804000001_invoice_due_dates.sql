-- 請求書ごとの支払期限の上書き。
-- 既定は「対象月の翌月10日」（lib/invoices.ts の defaultDueDate）。
-- ここに行がある請求書（まとめ先の顧客 × 対象月）だけ、その日付を使う。
create table if not exists public.invoice_due_dates (
  customer_id uuid not null references public.customers(id) on delete cascade,
  month       text not null,          -- YYYY-MM（請求の対象月）
  due_date    date not null,          -- YYYY-MM-DD（支払期限）
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (customer_id, month)
);

create index if not exists invoice_due_dates_month_idx on public.invoice_due_dates (month);

notify pgrst, 'reload schema';
