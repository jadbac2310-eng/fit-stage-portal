-- レッスンの終了日時。個人予定と同様に開始・終了で管理する（基本60分）。
alter table public.lessons add column if not exists end_at timestamptz;
