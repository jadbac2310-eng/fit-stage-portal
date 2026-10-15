-- FCT店舗ごとの歩合率（%）。
--
-- FCTの支払明細は「お客さまの単価の税抜 × 歩合率」を支払額にしている。
-- 直営店の実績は45%。店舗によって違うので、店舗マスタで持たせる。
--   例）単価 8,700円 → 税抜 7,909円 → ×45% → 3,559円
--
-- 何度流しても同じ結果になる。

alter table public.fct_stores add column if not exists rate integer not null default 45;

alter table public.fct_stores drop constraint if exists fct_stores_rate_check;
alter table public.fct_stores add  constraint fct_stores_rate_check
  check (rate >= 0 and rate <= 100);
