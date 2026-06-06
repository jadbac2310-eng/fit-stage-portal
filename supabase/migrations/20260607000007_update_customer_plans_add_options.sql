alter table public.customer_plans drop constraint customer_plans_plan_check;
alter table public.customer_plans add constraint customer_plans_plan_check
  check (plan in ('月2回', '月4回', '月8回', '都度払い', '回数券'));
