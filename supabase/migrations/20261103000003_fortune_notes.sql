-- 星まわりの「代表からのひとこと」。2026-11-03
--
-- 尚樹が、月ごとに スタッフ1人ずつ（member_id あり）または 全員へ（member_id null）ひとことを書く。
-- 星まわりページの上のほうに「坂根からのひとこと」として出る。
-- 何回流しても同じ結果になる（SQL Editor で Run する）。

create table if not exists public.fortune_notes (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid references public.members(id) on delete cascade,   -- null = 全員へ
  month      text not null,                                           -- YYYY-MM
  body       text not null,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 同じ人・同じ月は1件。member_id が null（全員）も1件だけ
create unique index if not exists idx_fortune_notes_member_month
  on public.fortune_notes (coalesce(member_id::text, 'all'), month);

alter table public.fortune_notes enable row level security;

notify pgrst, 'reload schema';

select count(*) as ひとことの件数 from public.fortune_notes;
