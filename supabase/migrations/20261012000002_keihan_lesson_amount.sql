-- 京阪総合サービスのレッスンに1件ずつ直接入っていた 9,000円 を外し、
-- 顧客マスタの「都度単価」（10,000円）に従わせる。
--
-- レッスン側に金額が入っているとマスタより優先されるため、
-- 都度単価を10,000円にしても請求書が9,000円のままだった。
-- 以後は顧客マスタを変えればすべてのレッスンに反映される。
--
-- 2回流しても2回目は0件（すでに外れているため）。
update public.lessons l
set    amount = null,
       updated_at = now()
from   public.customers c
where  c.id = l.customer_id
  and  c.full_name like '京阪%'
  and  l.amount is not null;
