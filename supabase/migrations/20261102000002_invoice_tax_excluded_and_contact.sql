-- 請求書：明細を税抜で出す設定と、請求メールの宛名（ご担当者名）。
-- 京阪総合サービスの要望（1レッスンあたりを税抜 ¥9,091 で並べる）。何回流しても同じ結果。

alter table public.customers
  add column if not exists invoice_tax_excluded boolean not null default false,
  add column if not exists billing_contact_name text;

-- 京阪総合サービスは税抜表示
update public.customers
   set invoice_tax_excluded = true, updated_at = now()
 where full_name like '%京阪総合%'
   and invoice_tax_excluded is distinct from true;

-- 請求メールの宛名（分かっている分だけ。未設定のところは「ご担当者様」になる）
update public.customers set billing_contact_name = '川﨑 征喜', updated_at = now()
 where full_name like '%京阪総合%' and billing_contact_name is null;
update public.customers set billing_contact_name = '吉田', updated_at = now()
 where full_name like '%大阪西電設%' and billing_contact_name is null;
update public.customers set billing_contact_name = '小林 蔵道', updated_at = now()
 where full_name like '%略の道%' and billing_contact_name is null;

-- 確認用
select full_name, invoice_tax_excluded as 税抜表示, billing_contact_name as メールの宛名
  from public.customers
 where full_name like '%京阪総合%' or full_name like '%大阪西電設%' or full_name like '%略の道%'
 order by full_name;
