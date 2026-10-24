-- 2026-10-24 のぶん、まとめて流せる1本
--
-- この日に出した3つのSQL（無料レッスンへの移し替え・前払い差し引きの表・支払日の列）を
-- 1本にまとめたもの。どれを流したか分からなくなったとき用。
-- すでに流したものがあっても二重には効かない。何回流しても安全。
--
-- 最後に「今どうなっているか」を表で出すので、それを見れば反映できたか分かる。

-- ① 前払い・差し引きの置き場所 ────────────────────────────
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

alter table public.commission_adjustments
  drop constraint if exists commission_adjustments_amount_check;
alter table public.commission_adjustments
  add  constraint commission_adjustments_amount_check
  check (amount <> 0);

create index if not exists commission_adjustments_month_idx
  on public.commission_adjustments (month);
create index if not exists commission_adjustments_member_idx
  on public.commission_adjustments (member_id);

-- ② コミッションの支払日（杉元さんは翌月15日、ほかは25日）─────
alter table public.members
  add column if not exists commission_pay_day integer not null default 25;

alter table public.members
  drop constraint if exists members_commission_pay_day_check;
alter table public.members
  add  constraint members_commission_pay_day_check
  check (commission_pay_day between 1 and 31);

update public.members
   set commission_pay_day = 15
 where name like '%杉元%'
   and commission_pay_day is distinct from 15;

-- ③ 回数券の回数を超えたレッスンを「無料レッスン」にする ─────
with ranked as (
  select l.id,
         p.total_count,
         row_number() over (
           partition by l.session_pass_id
           order by l.scheduled_at, l.created_at, l.id
         ) as rn
    from public.lessons l
    join public.session_passes p on p.id = l.session_pass_id
   where l.status is distinct from 'cancelled'
),
overflow as (
  select id from ranked where rn > total_count
)
update public.lessons l
   set session_pass_id = null,
       payment_type    = 'single',
       course          = '無料',
       amount          = 0,
       note            = case
                           when coalesce(l.note, '') = ''        then '回数券の回数を超えた分（無料レッスン）'
                           when l.note like '%無料レッスン%'      then l.note
                           else l.note || E'\n回数券の回数を超えた分（無料レッスン）'
                         end,
       updated_at      = now()
  from overflow o
 where l.id = o.id;

-- ④ 回数券の残回数を数え直す（ありえない値は書かない）─────────
update public.session_passes p
   set remaining_count = v.correct, updated_at = now()
  from (
    select p2.id, p2.total_count,
           p2.total_count - count(l.id) filter (where l.status is distinct from 'cancelled') as correct
      from public.session_passes p2
      left join public.lessons l on l.session_pass_id = p2.id
     group by p2.id, p2.total_count
  ) as v
 where p.id = v.id
   and v.correct between 0 and v.total_count
   and p.remaining_count is distinct from v.correct;

-- ⑤ Supabase に表の形を覚え直させる（PGRST205 対策）──────────
notify pgrst, 'reload schema';

-- ⑥ 今どうなっているかの確認 ────────────────────────────
select
  (select count(*) from public.lessons where course = '無料')                        as 無料レッスンの本数,
  (select commission_pay_day from public.members where name like '%杉元%' limit 1)   as 杉元さんの支払日,
  (select count(*) from public.commission_adjustments)                               as 前払い差し引きの件数,
  (select count(*)
     from public.session_passes p
    where p.total_count < (
      select count(*) from public.lessons l
       where l.session_pass_id = p.id and l.status is distinct from 'cancelled'
    ))                                                                               as 回数を超えたままの回数券;
