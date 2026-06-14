-- 1つの認証ユーザーが複数の担当者に紐づくのを防ぐ（重複すると getMemberByAuthUserId が壊れ
-- 「担当者アカウントに紐づいていません」が発生するため）。NULL は対象外の部分ユニーク制約。
create unique index if not exists members_auth_user_id_key
  on public.members (auth_user_id)
  where auth_user_id is not null;
