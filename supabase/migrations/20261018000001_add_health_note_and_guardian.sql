-- 入会申込書に増えた項目を保存する。
--
-- health_note       : 健康状態の自由記入（「ある／ない」では拾えないこと）
-- guardian_*        : 18歳未満の方の保護者の同意
--
-- 店舗の選択はフォームから外したので、store_id / store_name は
-- これ以降の申込では空になる。過去の申込のために列は残す。
alter table public.membership_applications
  add column if not exists health_note        text,
  add column if not exists guardian_name      text,
  add column if not exists guardian_relation  text,
  add column if not exists guardian_consent   boolean not null default false;
