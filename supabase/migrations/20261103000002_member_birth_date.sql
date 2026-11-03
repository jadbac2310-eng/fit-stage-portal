-- 担当者の生年月日（星まわり＝六星占術の考え方をもとにした運気を出すのに使う）。
-- 本人が「星まわり」ページで入れられる。管理者は担当者マスタでも入れられる。
-- 何回流しても安全。

alter table public.members
  add column if not exists birth_date date;

notify pgrst, 'reload schema';

-- 確認用：担当者の生年月日
select name as 担当者, birth_date as 生年月日 from public.members order by created_at;
