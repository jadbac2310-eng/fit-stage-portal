-- 請求書の「完了」の印（2026-11-25 尚樹「請求書も完了欄欲しい」）
-- 請求書の一覧で、請求先×対象月ごとに「完了」を付ける。FCT分は請求先の代わりに 'fct' で1行。
-- 付けた時刻と付けた人を残す（外すと行ごと消す）。
-- 何回流しても安全。

create table if not exists public.invoice_done (
  bill_key  text not null,                     -- 請求先の顧客ID（まとめ先）、FCT分は 'fct'
  month     text not null,                     -- 対象月 'YYYY-MM'
  done_at   timestamptz not null default now(),
  done_by   uuid references public.members(id) on delete set null,
  primary key (bill_key, month)
);

alter table public.invoice_done enable row level security;

-- 確認：表ができていれば 0 件
select count(*) as "件数" from public.invoice_done;
