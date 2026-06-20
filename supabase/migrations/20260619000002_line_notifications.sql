-- LINE通知連携。担当者ごとに LINE ユーザーIDを紐付け、連携用コードを保持する。
alter table members add column if not exists line_user_id   text;
alter table members add column if not exists line_link_code text;

create unique index if not exists members_line_user_id_key   on members (line_user_id)   where line_user_id   is not null;
create unique index if not exists members_line_link_code_key on members (line_link_code) where line_link_code is not null;

-- 送信済み記録（リマインド・朝まとめ等の重複送信を防ぐ）
create table if not exists line_notifications (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,            -- 'reminder' | 'morning' | 'event_added' | ...
  ref        text not null,            -- 予定id / 'YYYY-MM-DD' など
  member_id  uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (kind, ref, member_id)
);
