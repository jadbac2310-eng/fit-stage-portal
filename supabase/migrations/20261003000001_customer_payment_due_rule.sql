-- 顧客ごとの支払期限ルール。
--
-- これまでは「対象月の翌月末」固定で、別の条件のお客様は請求書ごとに
-- 手で期限を直す必要があった（直し忘れると違う期限が載ってしまう）。
--
-- payment_due_month: 'next' = 翌月 / 'same' = 当月
-- payment_due_day  : 期限の日。null は末日。
--   既定の 'next' + null で、これまでと同じ「翌月末」になる。
alter table public.customers
  add column if not exists payment_due_month text not null default 'next',
  add column if not exists payment_due_day   integer;

alter table public.customers
  drop constraint if exists customers_payment_due_month_check;
alter table public.customers
  add constraint customers_payment_due_month_check
  check (payment_due_month in ('same', 'next'));

alter table public.customers
  drop constraint if exists customers_payment_due_day_check;
alter table public.customers
  add constraint customers_payment_due_day_check
  check (payment_due_day is null or (payment_due_day between 1 and 31));
