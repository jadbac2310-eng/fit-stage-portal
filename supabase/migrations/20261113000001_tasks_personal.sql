-- やることを「会社のやること」と「一人ひとりの自分のやること」に分ける（2026-11-13）。
--
-- owner_member_id が空    … 会社のやること（代表・管理者だけが見る。今までの分は全部これ）
-- owner_member_id が入る  … その人だけの自分のやること（本人だけが見る）
--
-- 同じ題名は1件だけ、の決まりは「会社の中で」「その人の中で」に変える
-- （ほかの人と同じ題名「ブログを書く」を入れても弾かれないように）。
-- 何回流しても安全。

alter table public.tasks add column if not exists owner_member_id uuid references public.members(id) on delete cascade;
create index if not exists idx_tasks_owner on public.tasks (owner_member_id);

alter table public.tasks drop constraint if exists tasks_title_key;
create unique index if not exists tasks_owner_title_key
  on public.tasks ((coalesce(owner_member_id::text, '')), title);

-- 確認用：会社のやること＝今までの件数、自分のやること＝0 件 になっていれば成功
select
  count(*) filter (where owner_member_id is null)     as 会社のやること,
  count(*) filter (where owner_member_id is not null) as 自分のやること
from public.tasks;
