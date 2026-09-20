-- 体験レッスンに「場所（店舗・レンタルジム）」と「料金区分」を持たせる。
--
-- これまで体験レッスンは場所がフリーテキストのみで、店舗・レンタルジムを選べず、
-- レンタルジム代も記録できなかった（通常レッスンには既にある）。
-- また単価は常に体験レッスン価格（6,600円）固定で、体験枠で実施したが都度料金で
-- 請求するようなケースを表現できなかった。
--
-- course は null のとき「体験レッスン」として扱う（既存データはすべて null＝体験）。
-- amount はその回だけの金額。未設定ならコースの単価を使う。
alter table public.trial_lessons add column if not exists rental_gym_id  uuid references public.rental_gyms(id);
alter table public.trial_lessons add column if not exists rental_gym_fee integer;
alter table public.trial_lessons add column if not exists store_id       uuid references public.stores(id);
alter table public.trial_lessons add column if not exists course         text;
alter table public.trial_lessons add column if not exists amount         integer;

create index if not exists idx_trial_lessons_rental_gym on public.trial_lessons (rental_gym_id);
create index if not exists idx_trial_lessons_store      on public.trial_lessons (store_id);
