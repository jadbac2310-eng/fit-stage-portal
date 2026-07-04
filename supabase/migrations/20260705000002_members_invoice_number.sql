-- 担当者ごとのインボイス登録番号（コミッション明細に表示する）
alter table public.members add column if not exists invoice_number text;
