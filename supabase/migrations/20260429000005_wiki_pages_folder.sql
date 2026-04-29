alter table public.wiki_pages
  add column if not exists folder text not null default 'general';
