create table if not exists public.todos (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  description text,
  priority    text        not null default 'medium'
                          check (priority in ('high', 'medium', 'low')),
  completed   boolean     not null default false,
  created_at  timestamptz not null default now(),
  completed_at timestamptz,
  created_by  uuid references public.members(id) on delete set null,
  assigned_to uuid references public.members(id) on delete set null,
  completed_by uuid references public.members(id) on delete set null
);
