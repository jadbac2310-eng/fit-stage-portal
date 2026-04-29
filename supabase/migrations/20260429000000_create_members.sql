-- 担当者マスタ
create table if not exists public.members (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text,
  role          text,
  note          text,
  avatar_url    text,
  password_hash text,
  created_at    timestamptz not null default now()
);

-- アバター用 Storage バケット（public = 画像URLを直接参照できる）
insert into storage.buckets (id, name, public)
values ('member-avatars', 'member-avatars', true)
on conflict (id) do nothing;

-- Service Role Key を使うのでクライアント向けポリシーは最小限
create policy "Public read member avatars"
  on storage.objects for select
  using (bucket_id = 'member-avatars');
