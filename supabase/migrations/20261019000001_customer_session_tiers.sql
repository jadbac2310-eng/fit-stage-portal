-- 段階単価。回数で1回あたりの単価が変わる契約に対応する。
--
-- 例) 株式会社井上塗装店（井上さん・中村さんの2名をまとめて請求）
--     2人合わせて 4回目まで 9,200円 ／ 5回目から 9,000円
--
-- 請求まとめ先（法人など）の顧客に設定する。まとめられる側に入れても使わない。
-- 形は [{"fromCount": 1, "unitPrice": 9200}, {"fromCount": 5, "unitPrice": 9000}]
-- 段が増えても列を足さずに済むよう jsonb で持つ。
alter table public.customers add column if not exists session_tiers jsonb;

comment on column public.customers.session_tiers is
  '段階単価 [{"fromCount":1,"unitPrice":9200},...]。請求まとめ先に設定し、まとめた全員の合計回数で単価を決める';
