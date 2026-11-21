-- AIメール担当 フェーズ1（読むだけ）のテーブル。2026-11-21
-- 何回流しても安全（if not exists / on conflict do nothing）。Supabase の SQL Editor に貼って Run。
-- ワーカー（VPS・fit-stage-agents）とポータルは service role で読むので、RLS は有効にしてポリシーは作らない。

-- 1) 担当ごとの設定（緊急停止・月の上限・心拍・受信の続きの位置・まとめ通知の枠）
create table if not exists agent_settings (
  agent                  text primary key,               -- 'mail' など
  kill_switch            boolean not null default false, -- 緊急停止（ポータルのボタン・LINE の「停止」）
  kill_reason            text,
  killed_at              timestamptz,
  killed_by              text,
  phase                  int not null default 1,         -- 1=読むだけ 2=下書き 3=定型の自動返信
  monthly_budget_usd     numeric(10,2) not null default 10,
  auto_reply_daily_limit int not null default 10,        -- フェーズ3で使う
  heartbeat_at           timestamptz,                    -- ワーカーが5分ごとに書く
  worker_version         text,
  imap_uid_validity      text,
  imap_last_uid          bigint,
  last_digest_slot       text,                           -- '2026-11-21 12:30'
  budget_alert_month     text,                           -- 8割の知らせを送った月 '2026-11'
  down_alerted_at        timestamptz,                    -- 止まった知らせを送った時刻（ポータルの cron）
  updated_at             timestamptz not null default now()
);
alter table agent_settings enable row level security;
insert into agent_settings (agent) values ('mail') on conflict (agent) do nothing;

-- 2) 受け取ったメール・HPのお問い合わせと、その仕分け
create table if not exists mail_messages (
  id                 uuid primary key default gen_random_uuid(),
  agent              text not null default 'mail',
  source             text not null check (source in ('email','contact_form')),
  message_key        text not null unique,               -- 'mid:<Message-ID>' / 'contact:<uuid>'（二重に入れない）
  gmail_uid          bigint,
  gmail_thread_id    text,
  gmail_msg_id       text,
  from_address       text,
  from_name          text,
  to_address         text,                               -- 届いた自分のアドレス（返信はここから）
  subject            text,
  body_text          text,                               -- 決まりで無視にしたものは保存しない
  received_at        timestamptz not null default now(),
  bulk_hint          boolean not null default false,
  headers            jsonb not null default '{}'::jsonb,
  status             text not null default 'new' check (status in ('new','classified')),
  attempts           int not null default 0,
  error              text,
  -- 仕分け
  category           text check (category in ('faq','needs_review','sales','ignore')),
  confidence         text check (confidence in ('high','medium','low')),
  reason             text,
  summary            text,
  urgent             text check (urgent in ('none','complaint','same_day_change')),
  language           text,
  faq_sections       text[],
  classified_by      text check (classified_by in ('rule','ai')),
  model              text,
  classified_at      timestamptz,
  -- 尚樹の正解（フェーズ1の精度を測る）
  human_category     text check (human_category in ('faq','needs_review','sales','ignore')),
  human_note         text,
  reviewed_by        text,
  reviewed_at        timestamptz,
  -- 通知
  digest_slot        text,                               -- 載せたまとめ通知の枠
  urgent_notified_at timestamptz,
  created_at         timestamptz not null default now()
);
alter table mail_messages enable row level security;
create index if not exists mail_messages_status_idx   on mail_messages (agent, status, received_at);
create index if not exists mail_messages_received_idx on mail_messages (received_at desc);

-- 3) すべての処理のログ（受信・仕分け・通知・停止・エラー・人の操作）
create table if not exists agent_events (
  id          bigserial primary key,
  agent       text not null,
  event_type  text not null,
  message_id  uuid,
  detail      jsonb not null default '{}'::jsonb,
  actor       text not null default 'ai',                -- 'ai' / 'portal:<名前>' / 'line:<名前>'
  created_at  timestamptz not null default now()
);
alter table agent_events enable row level security;
create index if not exists agent_events_created_idx on agent_events (agent, created_at desc);

-- 4) Claude の使用量（呼ぶたびに1行。月の上限と8割の知らせに使う）
create table if not exists agent_api_usage (
  id                 bigserial primary key,
  agent              text not null,
  model              text not null,
  purpose            text not null,                      -- 'classify' など
  message_id         uuid,
  input_tokens       int not null default 0,
  output_tokens      int not null default 0,
  cache_read_tokens  int not null default 0,
  cache_write_tokens int not null default 0,
  cost_usd           numeric(12,6) not null default 0,
  created_at         timestamptz not null default now()
);
alter table agent_api_usage enable row level security;
create index if not exists agent_api_usage_created_idx on agent_api_usage (agent, created_at);

-- 確認用（Run のあと下に出る表）：テーブル4つ・設定の行1つ
select
  (select count(*) from information_schema.tables where table_schema = 'public'
     and table_name in ('agent_settings','mail_messages','agent_events','agent_api_usage')) as tables_4,
  (select count(*) from agent_settings where agent = 'mail') as settings_row_1;
