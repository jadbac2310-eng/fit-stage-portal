-- 回数券・月プランの入金額、顧客ごとの都度単価、顧客の担当営業を追加
alter table public.session_passes add column if not exists price integer;          -- 回数券の入金額（総額）
alter table public.customer_plans add column if not exists price integer;           -- 月プランの入金額（月額）
alter table public.customers      add column if not exists single_session_price integer;  -- 顧客ごとの都度単価
alter table public.customers      add column if not exists sales_member_id uuid references public.members(id) on delete set null; -- 担当営業
