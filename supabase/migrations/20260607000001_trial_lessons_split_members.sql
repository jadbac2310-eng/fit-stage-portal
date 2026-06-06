-- member_id を営業担当者として rename
alter table public.trial_lessons rename column member_id to sales_member_id;

-- トレーニング担当者を追加（任意）
alter table public.trial_lessons
  add column trainer_member_id uuid references public.members(id) on delete restrict;

-- インデックス更新
drop index if exists trial_lessons_member_idx;
create index trial_lessons_sales_member_idx   on public.trial_lessons (sales_member_id);
create index trial_lessons_trainer_member_idx on public.trial_lessons (trainer_member_id);
