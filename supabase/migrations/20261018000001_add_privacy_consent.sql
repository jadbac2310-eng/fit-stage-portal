-- 入会申し込みの「個人情報の取り扱いへの同意」を保存する。
--
-- フォームでは会員規約とは別のチェック項目として同意をいただいているのに、
-- ポータルへ送っていなかったため、何に同意したかの記録が片方しか残らなかった。
--
-- 20261017000001 を流す前でも後でも、どちらでも通るようにしてある。
alter table public.membership_applications
  add column if not exists agreed_to_privacy boolean not null default false;
