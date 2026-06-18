-- トラン系データに作成者・編集者を保持する（作成日時/更新日時は既存の created_at/updated_at）。
-- lessons.created_by は既存。updated_by を追加。
alter table public.lessons         add column if not exists updated_by uuid references public.members(id);

alter table public.trial_lessons   add column if not exists created_by uuid references public.members(id);
alter table public.trial_lessons   add column if not exists updated_by uuid references public.members(id);

alter table public.session_passes  add column if not exists created_by uuid references public.members(id);
alter table public.session_passes  add column if not exists updated_by uuid references public.members(id);

alter table public.customer_plans  add column if not exists created_by uuid references public.members(id);
alter table public.customer_plans  add column if not exists updated_by uuid references public.members(id);

-- personal_events.member_id が作成者。編集者(updated_by)を追加。
alter table public.personal_events add column if not exists updated_by uuid references public.members(id);
