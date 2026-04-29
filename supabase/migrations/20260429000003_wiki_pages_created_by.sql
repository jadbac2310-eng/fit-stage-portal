alter table public.wiki_pages
  add column if not exists created_by uuid references auth.users(id) on delete set null;
