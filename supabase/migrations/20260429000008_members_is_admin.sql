alter table public.members
  add column if not exists is_admin boolean not null default false;
