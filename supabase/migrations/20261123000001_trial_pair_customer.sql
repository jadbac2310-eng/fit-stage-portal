-- 2名で受けた体験の「2人目」（2026-11-23 尚樹：夫婦で体験→2人とも入会。引き継ぎをそれぞれ書けるように）。何回流しても同じ結果。
-- pair_customer_id   … 一緒に受けた2人目のお客さま（customers.id）。外部キーは付けない
--                      （付けると体験の読み込みの customers(...) の結び付きが2通りになって読めなくなるため）
-- pair_handover_note … 2人目の「次の人への引き継ぎ」（1人目は handover_note のまま）
alter table public.trial_lessons add column if not exists pair_customer_id uuid;
alter table public.trial_lessons add column if not exists pair_handover_note text;
create index if not exists trial_lessons_pair_customer_id_idx on public.trial_lessons (pair_customer_id);

-- 確認：2 なら OK
select count(*) as "足した列" from information_schema.columns
 where table_schema = 'public' and table_name = 'trial_lessons' and column_name in ('pair_customer_id', 'pair_handover_note');
