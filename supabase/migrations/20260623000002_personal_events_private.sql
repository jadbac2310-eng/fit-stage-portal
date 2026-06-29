-- 個人予定の非公開フラグ。true のとき、作成者と参加者以外には表示しない。既定は公開(false)。
alter table public.personal_events add column if not exists is_private boolean not null default false;
