-- 都度払いレッスンの金額（円）。null の場合はコース単価を使用する
alter table public.lessons add column if not exists amount integer;
