-- 個人予定のLINE通知ON/OFF。既定はON（従来どおり参加者へ通知）。
-- OFFにすると追加・変更・削除のLINE通知を送らない。
alter table public.personal_events add column if not exists notify boolean not null default true;
