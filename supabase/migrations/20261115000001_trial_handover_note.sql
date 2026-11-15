-- 体験レッスンにも「次の人への引き継ぎ」を書く欄（2026-11-15 尚樹の依頼）。
-- 通常レッスンは備考（lessons.note）に書いているが、体験の note は申込フォームの内容が入っているので、別の列にする。
-- 何回流しても安全。
alter table public.trial_lessons add column if not exists handover_note text;

-- 確認：列ができていれば 1
select count(*) as handover_note_column
from information_schema.columns
where table_schema = 'public' and table_name = 'trial_lessons' and column_name = 'handover_note';
