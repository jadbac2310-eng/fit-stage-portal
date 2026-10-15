-- 顧客の必須項目を「氏名」だけにする。
--
-- スポットで1〜2回だけ受けるお客さまはメールも生年月日も聞かないことがあり、
-- 必須のままだと仮の値を入れるしかなく、かえってデータが汚れていた。
--
-- 何度流しても同じ結果になる。

alter table public.customers alter column email         drop not null;
alter table public.customers alter column date_of_birth drop not null;
