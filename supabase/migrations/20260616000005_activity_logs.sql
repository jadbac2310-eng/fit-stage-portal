-- 監査ログ（ログイン履歴・操作ログ）。管理者がユーザーごとの操作を追跡できる。
create table if not exists public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid references public.members(id) on delete set null,
  member_name text,                       -- 記録時点の担当者名のスナップショット
  action      text not null,              -- login / logout / create / update / delete など
  entity_type text,                       -- lesson / customer / personal_event / rental_gym / ...
  entity_id   text,
  summary     text,                        -- 人が読める説明
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_activity_logs_created on public.activity_logs (created_at desc);
create index if not exists idx_activity_logs_member  on public.activity_logs (member_id);
