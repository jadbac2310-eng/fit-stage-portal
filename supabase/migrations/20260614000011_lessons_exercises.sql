-- レポートの種目ログ（種目名・重量・回数をセットごとに保持）。トレーニング内容(text)の代替。
alter table public.lessons       add column if not exists exercises jsonb;
alter table public.trial_lessons add column if not exists exercises jsonb;
