-- 個人予定に参加者（担当者マスタから複数選択）を持たせる。
-- 作成者(member_id)とは別に、参加メンバーの id を配列で保持する。
alter table personal_events
  add column if not exists participant_ids uuid[] not null default '{}';
