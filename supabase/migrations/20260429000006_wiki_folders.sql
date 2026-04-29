create table if not exists public.wiki_folders (
  name text primary key,
  created_at timestamptz not null default now()
);

-- seed existing folders from wiki_pages
insert into public.wiki_folders (name)
select distinct folder from public.wiki_pages
on conflict do nothing;
