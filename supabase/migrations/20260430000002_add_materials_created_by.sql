alter table public.materials
  add column if not exists created_by uuid references public.members(id) on delete set null;
