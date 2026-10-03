-- リマインド機能のための設定項目。

-- 1) 請求書の送付日。設定した日の朝に「送付日です」と知らせる。
alter table public.customers
  add column if not exists invoice_send_day integer;

alter table public.customers
  drop constraint if exists customers_invoice_send_day_check;
alter table public.customers
  add constraint customers_invoice_send_day_check
  check (invoice_send_day is null or (invoice_send_day between 1 and 31));

-- 2) レッスン開始前のリマインドを受け取るか。
--    自分の予定を把握している人には不要なので、担当者ごとに切れるようにする。
alter table public.members
  add column if not exists lesson_reminder boolean not null default true;
