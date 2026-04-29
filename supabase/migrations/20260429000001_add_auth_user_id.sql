alter table public.members
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

alter table public.members
  drop column if exists password_hash;
