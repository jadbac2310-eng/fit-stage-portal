-- 支払期限ルールに「翌々月」を足す（月末締め・翌々月10日払い の京阪総合サービス向け）。
-- payment_due_month: 'same' = 当月 / 'next' = 翌月 / 'next2' = 翌々月
-- 何回流しても同じ結果。

alter table public.customers
  drop constraint if exists customers_payment_due_month_check;
alter table public.customers
  add constraint customers_payment_due_month_check
  check (payment_due_month in ('same', 'next', 'next2'));

-- 京阪総合サービスを「翌々月10日」に（名前に「京阪総合」を含む顧客。無ければ何もしない）
update public.customers
   set payment_due_month = 'next2', payment_due_day = 10, updated_at = now()
 where full_name like '%京阪総合%'
   and (payment_due_month is distinct from 'next2' or payment_due_day is distinct from 10);

-- 確認用：京阪総合サービスの支払ルール（next2 / 10 なら成功）
select full_name, payment_due_month, payment_due_day
  from public.customers
 where full_name like '%京阪総合%';

-- 京阪総合サービスの毎月の固定項目「HP運用代行費用」¥5,500（税込）。
-- まだ同じ名前の項目が無いときだけ入れる（画面「マスタ管理 → 毎月の請求項目」で入れたものと同じ扱い）。
insert into public.customer_monthly_items (customer_id, name, amount)
select c.id, 'HP運用代行費用', 5500
  from public.customers c
 where c.full_name like '%京阪総合%'
   and not exists (
     select 1 from public.customer_monthly_items m
      where m.customer_id = c.id and m.name like '%運用代行%'
   );

-- 確認用：京阪総合サービスの毎月の項目（HP運用代行費用 5500 が1行あれば成功）
select c.full_name, m.name, m.amount, m.started_on, m.ended_on
  from public.customer_monthly_items m
  join public.customers c on c.id = m.customer_id
 where c.full_name like '%京阪総合%';
