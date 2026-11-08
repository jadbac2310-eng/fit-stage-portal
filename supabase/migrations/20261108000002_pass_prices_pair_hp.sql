-- プランマスタの回数券（2名様）の金額を、HPの料金表（出張の回数券）に合わせる。2026-11-08
--
-- 最初に入れた値は 1回 12,800／12,400／12,000 円で計算した古い金額だった。HPは 13,100／12,700／12,300 円。
--   8回  102,400 → 104,800
--   16回 198,400 → 203,200
--   32回 384,000 → 393,600
-- 1名様（76,800／148,800／288,000）はHPと同じなので触らない。
-- この表は、金額を入れずに作った回数券の売上・歩合を出すときの予備の値として使われる。
-- 店舗の回数券（2回・4回・8回）は人数×回数だけでは出張と区別できないので、
-- 回数券を足す画面のボタン（lib/session-pass-menus.ts）で金額を入れるようにした。
-- 何回流しても同じ結果になる（SQL Editor で Run する）。

update public.session_pass_prices set amount = 104800, updated_at = now() where person_count = 2 and total_count = 8;
update public.session_pass_prices set amount = 203200, updated_at = now() where person_count = 2 and total_count = 16;
update public.session_pass_prices set amount = 393600, updated_at = now() where person_count = 2 and total_count = 32;

-- 確認用：1名 76800／148800／288000、2名 104800／203200／393600 になっていれば完了
select person_count as 人数, total_count as 回数, amount as 金額
  from public.session_pass_prices
 order by person_count, total_count;
