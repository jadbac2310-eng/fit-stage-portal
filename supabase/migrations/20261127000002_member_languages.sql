-- 担当者の「話せる言語」（2026-11-27 尚樹「喋れる言語入力する欄もあるとよい」）
-- 例：「日本語・English」「English」。担当者マスタの編集で本人か管理者が入れる。何回流しても安全。

alter table public.members add column if not exists languages text;

-- 確認：列があれば 1
select count(*) as "言語の列"
from information_schema.columns
where table_schema = 'public' and table_name = 'members' and column_name = 'languages';
