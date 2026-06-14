-- 通常レッスンのレポート（トレーニング内容・お客さんの様子）。備考(note)は既存カラムを使用。
alter table public.lessons
  add column if not exists training_content    text,
  add column if not exists customer_impression text;
