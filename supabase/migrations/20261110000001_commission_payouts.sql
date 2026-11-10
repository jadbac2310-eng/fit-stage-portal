-- コミッションの支払いが「済んだか」を残す表（2026-11-10）。
-- ダッシュボードの代表専用の箱と、朝のLINEの知らせが見る。
-- 対象月×担当者で1行。明細を送った時刻と、振り込んだ時刻を持つ（まだなら null）。
-- 何回流しても安全。

create table if not exists public.commission_payouts (
  member_id         uuid not null references public.members(id) on delete cascade,
  month             text not null,                 -- 対象月 'YYYY-MM'（働いた月。支払いは翌月）
  statement_sent_at timestamptz,                   -- 明細を送った
  paid_at           timestamptz,                   -- 振り込んだ
  updated_by        uuid references public.members(id) on delete set null,
  updated_at        timestamptz not null default now(),
  primary key (member_id, month)
);

alter table public.commission_payouts enable row level security;

-- 確認用：表ができていれば 0 件（まだ何も印を付けていない）
select count(*) as 件数 from public.commission_payouts;
