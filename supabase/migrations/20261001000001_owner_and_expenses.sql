-- 利益＝オーナーの取り分、という考え方に合わせるための2点。
--
-- 1) オーナー（運営者）は歩合の対象外にする。
--    自分のレッスン売上は支払いとして出ていかず、まるごと利益に残る。
--    これにより「利益 ＝ オーナーの取り分」がそのまま成り立つ。
alter table public.members
  add column if not exists is_owner boolean not null default false;

-- 2) 一般経費。家賃・広告費・備品など、レッスンに紐づかない支出を月ごとに積む。
--    場所利用料（レンタルジム・FCT店舗）はレッスン側に持っているのでここには入れない。
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  incurred_on date not null,                      -- 計上日。この日付の属する月で集計する
  category    text not null default 'その他',
  title       text not null,
  amount      integer not null check (amount >= 0),
  note        text,
  created_by  uuid references public.members(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_expenses_incurred_on on public.expenses (incurred_on);
