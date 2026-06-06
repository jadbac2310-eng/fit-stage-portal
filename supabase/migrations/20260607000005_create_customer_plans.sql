create table public.customer_plans (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  plan        text not null check (plan in ('monthly', 'pay_as_you_go')),
  started_at  date not null,
  ended_at    date,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint customer_plans_date_order check (ended_at is null or ended_at >= started_at)
);

create index customer_plans_customer_idx on public.customer_plans (customer_id);
create index customer_plans_started_idx  on public.customer_plans (customer_id, started_at desc);
