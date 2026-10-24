-- コミッションの調整（前払いの差し引き・立替の精算など）
--
-- 「先に現金で渡したぶんを、次のコミッションから差し引く」を覚えておくための表。
-- 口約束や個人のメモに置いておくと払うときに忘れる（払い過ぎになる）ので、
-- 対象月のコミッション明細に自動で載るようにしてある。
--
-- amount はマイナス＝差し引く／プラス＝足す。
-- 月は 'YYYY-MM' で、そのコミッション明細に載る。
-- 何回流しても安全。

create table if not exists public.commission_adjustments (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members(id) on delete cascade,
  month      text not null,
  label      text not null,
  amount     integer not null,
  note       text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.commission_adjustments
  drop constraint if exists commission_adjustments_month_check;
alter table public.commission_adjustments
  add  constraint commission_adjustments_month_check
  check (month ~ '^[0-9]{4}-[0-9]{2}$');

-- 0円の調整は意味が無いので入れさせない（入っていると明細に空の行が出るだけ）
alter table public.commission_adjustments
  drop constraint if exists commission_adjustments_amount_check;
alter table public.commission_adjustments
  add  constraint commission_adjustments_amount_check
  check (amount <> 0);

create index if not exists commission_adjustments_month_idx
  on public.commission_adjustments (month);
create index if not exists commission_adjustments_member_idx
  on public.commission_adjustments (member_id);

-- Supabase は「どんな表があるか」を別に覚えていて、作った直後はそれが古いままのことがある。
-- そのままだとアプリから PGRST205（表が見つからない）になるので、覚え直させる。
notify pgrst, 'reload schema';
