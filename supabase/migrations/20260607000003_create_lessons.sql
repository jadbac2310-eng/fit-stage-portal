create table public.lessons (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references public.customers(id) on delete cascade,
  trainer_member_id uuid references public.members(id) on delete set null,
  scheduled_at      timestamptz not null,
  location          text,
  course            text,
  payment_type      text check (payment_type is null or payment_type in ('monthly', 'session_pass', 'single')),
  status            text not null default 'scheduled'
                      check (status in ('scheduled', 'completed', 'cancelled')),
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index lessons_customer_idx  on public.lessons (customer_id);
create index lessons_trainer_idx   on public.lessons (trainer_member_id);
create index lessons_scheduled_idx on public.lessons (scheduled_at desc);
create index lessons_status_idx    on public.lessons (status);
