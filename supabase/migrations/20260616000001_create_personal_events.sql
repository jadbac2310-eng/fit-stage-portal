-- 個人予定（Lifebear風の個人カレンダー）。
-- 担当者ごとの予定を保持し、スケジュール画面で全員が閲覧できる（編集・削除は本人＋管理者）。
create table if not exists public.personal_events (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  title       text not null,
  all_day     boolean not null default false,
  start_at    timestamptz not null,
  end_at      timestamptz,
  location    text,
  memo        text,
  color       text not null default 'blue',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_personal_events_start_at on public.personal_events (start_at);
create index if not exists idx_personal_events_member   on public.personal_events (member_id);
