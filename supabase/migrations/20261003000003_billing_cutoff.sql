-- 請求の締日。
--
-- これまでは暦の月（1日〜末日）で集計していたが、「毎月20日締め」のように
-- 月をまたぐ期間で請求する取引先がある。
--
-- null は従来どおり月末締め（＝暦の月）。
-- 20 を入れると、2026年10月分 = 2026/09/21 〜 2026/10/20 になる。
alter table public.customers
  add column if not exists billing_cutoff_day integer;

alter table public.customers
  drop constraint if exists customers_billing_cutoff_day_check;
alter table public.customers
  add constraint customers_billing_cutoff_day_check
  check (billing_cutoff_day is null or (billing_cutoff_day between 1 and 31));
