create table public.customers (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null,
  full_name          text not null,
  date_of_birth      date not null,
  address            text not null,
  phone_number       text not null,
  plan               text not null check (plan in ('monthly', 'pay_as_you_go')),
  desired_start_date date not null,
  agreed_to_terms    boolean not null default false,
  electronic_signature text not null,
  status             text not null default 'active' check (status in ('active', 'inactive', 'pending')),
  note               text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index customers_email_idx on public.customers (email);
create index customers_status_idx on public.customers (status);
create index customers_plan_idx on public.customers (plan);
