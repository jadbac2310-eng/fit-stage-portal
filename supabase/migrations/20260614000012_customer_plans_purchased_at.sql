-- 月額プランの購入日（請求の計上月に使用）。既存行は適用開始日で初期化。
alter table public.customer_plans add column if not exists purchased_at date;
update public.customer_plans set purchased_at = started_at where purchased_at is null;
