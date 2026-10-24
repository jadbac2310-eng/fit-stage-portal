-- キャンセルした回で回数券が減ったままになっていたぶんを直す（2026-10-24）
--
-- 約束: 当日キャンセルは回数券を消費する／キャンセルは消費しない。
-- ところがレッスンをキャンセルにしても残回数を戻しておらず、
-- キャンセルのたびに1回ぶん減ったままになっていた。
-- アプリ側は直したので、ここでは既存データの残回数を数え直す。
--
-- 正しい残り = 全回数 − （その回数券に紐づくレッスンのうち、キャンセル以外の件数）
-- 何回流しても結果は同じ（ずれている行だけ直すため、2回目以降は0件）。

update public.session_passes p
   set remaining_count = v.correct,
       updated_at = now()
  from (
    select p2.id,
           p2.total_count - count(l.id) filter (where l.status is distinct from 'cancelled') as correct
      from public.session_passes p2
      left join public.lessons l on l.session_pass_id = p2.id
     group by p2.id, p2.total_count
  ) as v
 where p.id = v.id
   and p.remaining_count is distinct from v.correct;
