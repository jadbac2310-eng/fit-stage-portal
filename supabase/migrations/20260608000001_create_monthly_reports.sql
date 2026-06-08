create table public.monthly_reports (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references public.customers(id) on delete cascade,
  trainer_member_id uuid references public.members(id) on delete set null,
  year_month        text not null,
  content           text,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint monthly_reports_year_month_format check (year_month ~ '^\d{4}-\d{2}$'),
  unique (customer_id, year_month)
);
