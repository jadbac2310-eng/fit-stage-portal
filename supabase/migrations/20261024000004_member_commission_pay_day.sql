-- コミッションの支払日を担当者ごとに持たせる
--
-- 月末じめの翌月払いだが、支払日が人によって違う。
--   杉元さん … 翌月15日
--   ほかのトレーナー … 翌月25日
-- 画面に「翌月25日払い」と決め打ちで書いていたので、杉元さんだけ実際と違っていた。
--
-- 何回流しても安全。

alter table public.members
  add column if not exists commission_pay_day integer not null default 25;

alter table public.members
  drop constraint if exists members_commission_pay_day_check;
alter table public.members
  add  constraint members_commission_pay_day_check
  check (commission_pay_day between 1 and 31);

-- 杉元さんだけ15日。あとから担当者マスタの画面でも変えられる。
update public.members
   set commission_pay_day = 15
 where name like '%杉元%'
   and commission_pay_day is distinct from 15;

-- 列を足した直後は Supabase が古い形を覚えたままのことがあるので、覚え直させる
notify pgrst, 'reload schema';
