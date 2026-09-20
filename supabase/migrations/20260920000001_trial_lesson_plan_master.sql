-- 体験レッスンの単価（6,600円）をプランマスタで管理できるようにする。
--
-- これまで体験レッスンの単価は lib/commissions-types.ts の LESSON_PRICE に直書きされており、
-- 歩合・売上では 6,600円 で計算されていたがマスタ画面からは変更できず、請求書にも載らなかった。
-- マスタに行を追加することで、他のコースと同じように金額を編集できるようにする。
--
-- payment_type は「1回あたりの単価」で扱うため 'single'。
-- 月額プランの選択肢（プラン管理画面）は payment_type='monthly' のみを見ているため、
-- この行が契約プランの選択肢に混ざることはない。
insert into public.plans (name, payment_type, sessions, amount, sort_order) values
  ('体験レッスン', 'single', 1, 6600, 6)
on conflict (name) do nothing;
