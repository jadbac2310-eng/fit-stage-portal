-- 請求書まわり: 請求宛名の上書きと、別顧客へまとめて請求する設定。
-- billing_name           : 請求書の宛名を上書き（未設定なら氏名を使用）
-- billing_to_customer_id : この顧客の請求を別の顧客にまとめる（例: Mai&Kai → Dakin）
alter table public.customers add column if not exists billing_name text;
alter table public.customers add column if not exists billing_to_customer_id uuid references public.customers(id);
create index if not exists idx_customers_billing_to on public.customers (billing_to_customer_id);
