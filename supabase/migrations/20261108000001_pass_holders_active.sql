-- 回数券を持っているのに「審査中」「体験申し込み」のままのお客さまを「在籍中」にする（2026-11-08）。
--
-- 契約成功で自動的に「審査中」になるが、そこから「在籍中」に変える仕組みが無かった。
-- これからは回数券を追加した時点でポータルが自動で「在籍中」にする（lib/session-passes.ts）。
-- このSQLは、それより前に回数券を買った人のぶんをまとめて直す。退会の人は触らない。
-- 何回流しても同じ結果になる（SQL Editor で Run する）。

-- 確認用（前）：直す対象
select c.full_name as 在籍中にする人, c.status as いまの状態
  from public.customers c
 where c.status in ('pending', 'trial')
   and exists (select 1 from public.session_passes p where p.customer_id = c.id)
 order by c.full_name;

update public.customers c
   set status = 'active', updated_at = now()
 where c.status in ('pending', 'trial')
   and exists (select 1 from public.session_passes p where p.customer_id = c.id);

-- 確認用（後）：回数券があるのに審査中・体験のままの人。0 なら完了
select count(*) as まだ審査中の回数券持ち
  from public.customers c
 where c.status in ('pending', 'trial')
   and exists (select 1 from public.session_passes p where p.customer_id = c.id);
