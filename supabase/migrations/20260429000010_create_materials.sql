-- 素材マスタ
create table if not exists public.materials (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  category    text,
  image_url   text not null,
  created_at  timestamptz not null default now()
);

-- 素材画像用 Storage バケット（public = URLで直接参照できる）
insert into storage.buckets (id, name, public)
values ('material-images', 'material-images', true)
on conflict (id) do nothing;

-- Service Role Key を使うのでクライアント向けポリシーは最小限
create policy "Public read material images"
  on storage.objects for select
  using (bucket_id = 'material-images');
