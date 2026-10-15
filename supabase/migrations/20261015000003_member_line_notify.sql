-- 担当者ごとの「LINE通知を送る」スイッチ。
--
-- これまでLINE通知の宛先は「管理者かどうか」と「LINE連携しているか」だけで決まっていて、
-- 管理者のままLINE通知だけ止める方法が無かった。
-- off にすると、その担当者にはどのLINE通知も送らない
-- （レッスン登録のお知らせ・予定の変更・開始前リマインド・予約の申込、すべて）。
--
-- 何度流しても同じ結果になる。

alter table public.members add column if not exists line_notify boolean not null default true;
