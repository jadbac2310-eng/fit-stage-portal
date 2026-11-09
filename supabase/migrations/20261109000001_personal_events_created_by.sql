-- 個人予定に「登録した人」（created_by）を持たせる。2026-11-09
--
-- 他の人のスケジュールに予定を入れられるようにした（member_id＝誰の予定、created_by＝入れた人）。
-- 入れた人があとで直したり消したりできるように、入れた人を覚えておく。
-- 今までの予定は、本人が自分で入れたものなので member_id をそのまま入れる。
-- 何回流しても同じ結果になる（SQL Editor で Run する）。

alter table public.personal_events
  add column if not exists created_by uuid references public.members(id) on delete set null;

update public.personal_events set created_by = member_id where created_by is null;

notify pgrst, 'reload schema';

-- 確認用：登録した人が空の予定。0 なら完了
select count(*) as 登録者が空の予定 from public.personal_events where created_by is null;
