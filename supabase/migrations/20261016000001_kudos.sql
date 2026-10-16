-- トレーナー同士で送りあう「👏」。
--
-- 1人が1日1回だけ、相手ごとに押せる（もう一度押すと取り消し）。
-- 誰が誰に押したかを持つのは、二重に押せないようにするためだけ。
--
-- 何度流しても同じ結果になる。

create table if not exists public.kudos (
  id             uuid primary key default gen_random_uuid(),
  from_member_id uuid not null references public.members(id) on delete cascade,
  to_member_id   uuid not null references public.members(id) on delete cascade,
  day            date not null,
  emoji          text not null default '👏',
  created_at     timestamptz not null default now()
);

-- 同じ人に同じ日・同じ絵文字で二重に押せないようにする
create unique index if not exists kudos_unique_idx
  on public.kudos (from_member_id, to_member_id, day, emoji);

create index if not exists kudos_day_idx on public.kudos (day);

-- 他のテーブルと同じく、アプリ（サービスロール）からだけ読み書きする
alter table public.kudos enable row level security;
