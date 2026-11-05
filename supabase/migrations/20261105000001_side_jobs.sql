-- 単発の仕事（マシン設置など、レッスン以外の請負）。2026-11-05
--
-- 例：マシン設置を ¥70,000 で請け負い、設置はアヴニールに ¥50,000 で外注 → 差額 ¥20,000 が利益。
-- amount（いただいた金額）は売上に、cost（外注先に払う金額）は「外注費（単発）」として利益から差し引く。
-- カードでいただいたら、決済手数料も利益から差し引く（入金日の月で）。
-- 何回流しても同じ結果になる（SQL Editor で Run する）。

create table if not exists public.side_jobs (
  id          uuid primary key default gen_random_uuid(),
  done_on     date not null,                 -- この日付の月の売上として数える
  title       text not null,                 -- 内容（例：マシン設置）
  client      text,                          -- 依頼主（お客様・会社名）
  amount      integer not null default 0,    -- いただいた金額（税込）＝売上
  cost        integer not null default 0,    -- 外注先に払う金額（税込）＝外注費
  vendor      text,                          -- 外注先（例：アヴニール）
  note        text,
  created_by  uuid references public.members(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_side_jobs_done_on on public.side_jobs (done_on);

-- 受け取り方と入金日（カードなら決済手数料を利益から引く。料率は入金の記録と同じ）。2026-11-05 追加
alter table public.side_jobs
  add column if not exists pay_method text,   -- 現金／振込／カード（タッチ 2.5%）／カード（キー入力 3.6%）／PayPay（3.25%）／その他
  add column if not exists paid_on    date;   -- 入金日。空なら日付（done_on）と同じ扱い

alter table public.side_jobs enable row level security;

notify pgrst, 'reload schema';

select count(*) as 単発の仕事の件数 from public.side_jobs;
