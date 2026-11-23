-- 研修中の歩合を「日付で決める」から「手で オン／オフ」に（2026-11-23 尚樹「タイミング見て自分で切り替えられる方がいい」）
--
-- training_from  … 研修を始めた日（オンにした日。この日のレッスンから研修の額）
-- training_until … 研修を終えた日（オフにした日の前の日。空＝研修中）
-- training_pay   … 研修中の1レッスンの支払額
-- オフにしても3つとも残すので、研修中にやったレッスンは後から見ても研修の額のまま。
-- 何回流しても安全。

alter table public.members add column if not exists training_pay   integer;
alter table public.members add column if not exists training_until date;
alter table public.members add column if not exists training_from  date;

-- 確認：研修の列の数（3 なら OK）
select count(*) as "研修の列"
from information_schema.columns
where table_schema = 'public' and table_name = 'members'
  and column_name in ('training_pay', 'training_until', 'training_from');
