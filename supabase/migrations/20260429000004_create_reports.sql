create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  title text not null,
  slug text not null,
  subtitle text,
  date text,
  target_url text,
  content text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(section, slug)
);
