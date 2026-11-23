-- 研修中のトレーナーの歩合（2026-11-23 尚樹「ルークは研修期間1ヶ月で 3,000円固定。1ヶ月たったら50%」）
--
-- training_pay   … 研修中は 1レッスンにつき この額を払う（歩合率はかけない）
-- training_until … 研修の最後の日（この日のレッスンまでが研修の額。次の日から通常の歩合）
-- どちらかが空なら研修なし（今までどおり）。担当者マスタの編集で管理者が入れる。
-- 何回流しても安全。

alter table public.members add column if not exists training_pay   integer;
alter table public.members add column if not exists training_until date;

alter table public.members drop constraint if exists members_training_pay_check;
alter table public.members add  constraint members_training_pay_check
  check (training_pay is null or training_pay >= 0);

-- 確認：足した列の数（2 なら OK）
select count(*) as "足した列"
from information_schema.columns
where table_schema = 'public' and table_name = 'members'
  and column_name in ('training_pay', 'training_until');
