-- 回数券の「残数が無いのに予約できてしまう／残数が実態より増える」不具合の修正。
--
-- 旧 decrement_session_pass は `where remaining_count > 0` のため、残数0のときは
-- 無言で何もしなかった。残16回の回数券に17件まとめて予約すると、17件目は0消費のまま
-- レッスンだけが登録される（＝16回券に17レッスンが紐づく）状態になっていた。
-- さらに旧 increment_session_pass には上限が無く、その過剰分の1件を削除すると
-- 残数が 0 → 1 に増え、「16回目/全16回」なのに「残り1回」と表示されていた。
--
-- 対策:
--   1) reserve_session_pass … 必要数をまとめて確保。足りなければ1回も消費せず false。
--   2) release_session_pass … 返却は total_count を上限にクランプ。
--   3) 既存データの残数を「総回数 - 紐づくレッスン件数」で復旧。
--
-- 旧 decrement_session_pass / increment_session_pass は、マイグレーション適用前の
-- アプリからの呼び出しが残りうるため削除せずそのまま残す（新コードからは呼ばない）。

-- 1) 残数を amount 回ぶん確保する。足りなければ何も更新せず false を返す。
--    1本の UPDATE で判定と更新を行うため、同時実行でも残数を割り込まない。
create or replace function reserve_session_pass(pass_id uuid, amount integer default 1)
returns boolean
language plpgsql
as $$
declare
  updated integer;
begin
  if amount is null or amount <= 0 then
    return true;
  end if;

  update public.session_passes
     set remaining_count = remaining_count - amount,
         updated_at      = now()
   where id = pass_id
     and remaining_count >= amount;

  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

-- 2) 残数を amount 回ぶん戻す。総回数を超えて増えないようにする。
create or replace function release_session_pass(pass_id uuid, amount integer default 1)
returns void
language plpgsql
as $$
begin
  if amount is null or amount <= 0 then
    return;
  end if;

  update public.session_passes
     set remaining_count = least(remaining_count + amount, total_count),
         updated_at      = now()
   where id = pass_id;
end;
$$;

-- 3) 既存データの復旧。
--    残数の正は「総回数 - 紐づくレッスン件数」（レッスン作成時に消費・削除時に返却するため、
--    キャンセル済みのレッスンも消費1回として数える）。過剰予約されていた回数券は 0 に丸める。
update public.session_passes p
   set remaining_count = greatest(
         p.total_count - (select count(*)::int from public.lessons l where l.session_pass_id = p.id),
         0
       ),
       updated_at = now()
 where p.remaining_count <> greatest(
         p.total_count - (select count(*)::int from public.lessons l where l.session_pass_id = p.id),
         0
       );
