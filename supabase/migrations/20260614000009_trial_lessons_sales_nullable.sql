-- カウンセリングシートから体験レッスンを自動作成する際、営業担当は後で割り当てるため
-- sales_member_id を NULL 許容にする（未割当の下書き体験レッスンを許可）。
alter table public.trial_lessons alter column sales_member_id drop not null;
