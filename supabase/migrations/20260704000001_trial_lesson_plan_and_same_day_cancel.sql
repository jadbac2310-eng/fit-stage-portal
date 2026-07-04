-- 体験レッスンの単価をプランマスタに追加（管理者がプランマスタ画面から編集できるようにする）
insert into public.plans (name, payment_type, sessions, amount, sort_order) values
  ('体験レッスン', 'single', 1, 6600, 6)
on conflict (name) do nothing;

-- レッスンに「当日キャンセル」ステータスを追加（実施扱い・売上と歩合は発生するが見た目でキャンセルとわかるようにする）
alter table public.lessons drop constraint if exists lessons_status_check;
alter table public.lessons add constraint lessons_status_check
  check (status in ('scheduled', 'completed', 'cancelled', 'cancelled_same_day'));
