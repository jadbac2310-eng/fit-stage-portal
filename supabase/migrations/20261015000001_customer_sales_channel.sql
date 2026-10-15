-- 顧客の「担当営業」に、自社の営業のかわりに FCT（ファーストクラストレーナーズ）を置けるようにする。
--
-- FCT経由のお客さまは
--   ・FCTの店舗でレッスンするので、会場（レンタル）代がかからない
--   ・お客さまに請求書は出さない（FCTから1レッスンあたり一定額が入る）
--   ・自社の営業がついていないので、営業歩合も成約ボーナスも発生しない
-- という扱いになる。この3つを1つの設定だけで切り替えられるようにするための列。
--
-- 何度流しても同じ結果になる。

alter table public.customers add column if not exists sales_channel text not null default 'own';

alter table public.customers drop constraint if exists customers_sales_channel_check;
alter table public.customers add  constraint customers_sales_channel_check
  check (sales_channel in ('own', 'fct'));

-- FCT経由のお客さまに自社の担当営業は付かない（画面でもどちらか一方しか選べない）
update public.customers
set    sales_member_id = null, updated_at = now()
where  sales_channel = 'fct' and sales_member_id is not null;
