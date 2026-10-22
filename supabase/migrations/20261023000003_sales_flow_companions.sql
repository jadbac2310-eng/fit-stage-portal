-- ホテル営業：流れを「テレアポ → 企画書作成 → 訪問」にそろえ、訪問の付き添いを入れられるようにする（2026-10-23）
-- 何回流しても同じ結果になる（SQL Editor で Run する）。

-- 1) 訪問の付き添い（2人で行く場合）。スケジュールの予定にも参加者として入る
alter table public.sales_target_logs
  add column if not exists companion_ids uuid[] not null default '{}';

-- 2) 状況を「未着手 / テレアポ / 企画書作成 / 訪問 / 提携 / 見送り / 保留」にそろえる
update public.sales_targets set status = 'テレアポ'   where status in ('電話済', 'アポ打診中');
update public.sales_targets set status = '企画書作成' where status = '企画書準備中';
update public.sales_targets set status = '訪問'       where status in ('アポ確定', '面談済', '提案済', 'トライアル中');

-- 3) 記録の種類を「電話 / 訪問 / メモ」にそろえる（アポ＝訪問の予定）
update public.sales_target_logs set kind = '訪問' where kind = 'アポ';
update public.sales_target_logs set kind = 'メモ' where kind = 'メール';
