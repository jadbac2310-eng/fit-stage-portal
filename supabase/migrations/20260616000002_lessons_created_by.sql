-- 通常レッスンに「追加した人」を記録する。表示と編集権限（作成者＋管理者のみ編集可）に使用。
alter table public.lessons add column if not exists created_by uuid references public.members(id);
create index if not exists idx_lessons_created_by on public.lessons (created_by);
