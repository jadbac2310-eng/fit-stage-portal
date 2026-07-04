-- 終了時刻機能の導入前に登録されたレッスンには end_at が未設定のため、
-- 開始時刻+60分（基本レッスン時間）を一括で設定する。
update public.lessons
set end_at = scheduled_at + interval '1 hour'
where end_at is null;
