-- 月次レッスンレポートの送付管理。
-- 顧客 × 対象月（YYYY-MM）ごとに「送付済み」を記録する（行が存在＝送付済み）。
create table if not exists report_deliveries (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  period      text not null,                       -- 'YYYY-MM'
  sent_at     timestamptz not null default now(),
  sent_by     uuid references members(id),
  channel     text,                                -- 'line' 等
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (customer_id, period)
);

create index if not exists report_deliveries_period_idx on report_deliveries (period);
