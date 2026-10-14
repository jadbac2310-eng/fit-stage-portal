-- 店舗（FIT STAGE店舗）にも1回あたりの利用料を持たせる。
--
-- これまで店舗は「自社なので場所代はかからない」前提で料金欄が無かったが、
-- 庄内店・曽根城山店は実際に1回2,500円かかっていて、利益から引かれていなかった。
-- FCT店舗・アヴニール店舗と同じ扱いにする。
--
-- あわせて、レンタルジムの「F-with-M Lab 庄内」はFIT STAGE庄内店と同じ場所なので、
-- 庄内店にまとめる（過去のレッスンも付け替える）。
--
-- 何度流しても同じ結果になる。

-- ① 列を足す
alter table public.stores        add column if not exists fee integer not null default 0;
alter table public.stores        drop constraint if exists stores_fee_check;
alter table public.stores        add  constraint stores_fee_check check (fee >= 0);

alter table public.lessons       add column if not exists store_fee integer;
alter table public.trial_lessons add column if not exists store_fee integer;

-- 顧客ごとの会場料金で「店舗」も指定できるようにする
alter table public.customer_venue_fees drop constraint if exists customer_venue_fees_venue_kind_check;
alter table public.customer_venue_fees add  constraint customer_venue_fees_venue_kind_check
  check (venue_kind in ('gym', 'fct', 'avenir', 'store'));

-- ② 店舗マスタの料金。江坂は0円、庄内と曽根城山は2,500円
update public.stores set fee = 2500, updated_at = now()
where (name like '%庄内%' or name like '%曽根%') and fee is distinct from 2500;

update public.stores set fee = 0, updated_at = now()
where name like '%江坂%' and fee is distinct from 0;

-- ③ レンタルジム「F-with-M Lab 庄内」のレッスンを、FIT STAGE庄内店へ付け替える
update public.lessons l
set    store_id       = (select id from public.stores where name like '%庄内%' order by created_at limit 1),
       store_fee      = 2500,
       rental_gym_id  = null,
       rental_gym_fee = null,
       updated_at     = now()
from   public.rental_gyms g
where  l.rental_gym_id = g.id
  and  g.name like '%F-with-M%'
  and  exists (select 1 from public.stores where name like '%庄内%');

update public.trial_lessons t
set    store_id       = (select id from public.stores where name like '%庄内%' order by created_at limit 1),
       store_fee      = 2500,
       rental_gym_id  = null,
       rental_gym_fee = null,
       updated_at     = now()
from   public.rental_gyms g
where  t.rental_gym_id = g.id
  and  g.name like '%F-with-M%'
  and  exists (select 1 from public.stores where name like '%庄内%');

-- ④ 参照が無くなったので、レンタルジムマスタから F-with-M Lab 庄内 を消す
delete from public.rental_gyms
where name like '%F-with-M%'
  and not exists (select 1 from public.lessons       where rental_gym_id = rental_gyms.id)
  and not exists (select 1 from public.trial_lessons where rental_gym_id = rental_gyms.id);

-- ⑤ 庄内店・曽根城山店の過去のレッスンにも2,500円を入れる（オーナーの指示で過去ぶんも揃える）
update public.lessons l
set    store_fee = 2500, updated_at = now()
from   public.stores s
where  l.store_id = s.id
  and  (s.name like '%庄内%' or s.name like '%曽根%')
  and  l.store_fee is distinct from 2500;

update public.trial_lessons t
set    store_fee = 2500, updated_at = now()
from   public.stores s
where  t.store_id = s.id
  and  (s.name like '%庄内%' or s.name like '%曽根%')
  and  t.store_fee is distinct from 2500;

-- ⑥ 江坂店は0円なので、金額は入れない（入っていたら外す）
update public.lessons l
set    store_fee = null, updated_at = now()
from   public.stores s
where  l.store_id = s.id and s.name like '%江坂%' and l.store_fee is not null;

update public.trial_lessons t
set    store_fee = null, updated_at = now()
from   public.stores s
where  t.store_id = s.id and s.name like '%江坂%' and t.store_fee is not null;
