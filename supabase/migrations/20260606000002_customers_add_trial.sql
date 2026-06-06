-- Add trial to status constraint
alter table public.customers drop constraint customers_status_check;
alter table public.customers add constraint customers_status_check
  check (status in ('active', 'inactive', 'pending', 'trial'));

-- Make plan nullable (trial customers haven't chosen a plan yet)
alter table public.customers alter column plan drop not null;
alter table public.customers drop constraint customers_plan_check;
alter table public.customers add constraint customers_plan_check
  check (plan is null or plan in ('monthly', 'pay_as_you_go'));

-- Make electronic_signature nullable
alter table public.customers alter column electronic_signature drop not null;
