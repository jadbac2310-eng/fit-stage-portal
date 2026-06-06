create table public.trial_lessons (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  member_id     uuid not null references public.members(id) on delete restrict,
  scheduled_at  timestamptz not null,
  location      text,
  status        text not null default 'scheduled'
                  check (status in ('scheduled', 'completed', 'cancelled')),
  contracted    boolean,
  contract_plan text check (contract_plan is null or contract_plan in ('monthly', 'pay_as_you_go')),
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index trial_lessons_customer_idx  on public.trial_lessons (customer_id);
create index trial_lessons_member_idx    on public.trial_lessons (member_id);
create index trial_lessons_scheduled_idx on public.trial_lessons (scheduled_at desc);
create index trial_lessons_status_idx    on public.trial_lessons (status);
