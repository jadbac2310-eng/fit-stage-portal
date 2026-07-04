-- 時給業務：管理者だけが担当者に割り当てられる時給制の業務。スケジュールと歩合明細の両方に反映する。
create table if not exists public.hourly_tasks (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.members(id) on delete cascade,
  title        text not null,
  scheduled_at timestamptz not null,
  end_at       timestamptz not null,
  hourly_rate  integer not null check (hourly_rate >= 0),
  location     text,
  note         text,
  status       text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_by   uuid references public.members(id),
  updated_by   uuid references public.members(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists hourly_tasks_member_idx     on public.hourly_tasks (member_id);
create index if not exists hourly_tasks_scheduled_idx   on public.hourly_tasks (scheduled_at desc);
