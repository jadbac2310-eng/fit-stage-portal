-- 回数券の回数を超えて紐づいていたレッスンを「無料レッスン」にする
--
-- 堀さんの3回券にレッスンが6本、新森さんの15回券に17本ひもづいていた。
-- 券の回数より多いので、どれかが別の券のぶんか、券なしで受けたぶん。
-- どれを外すかは機械では決められないので、オーナー判断で
-- 「超えたぶんは無料レッスンにする」ことにした（2026-10-24）。
--
-- 日付の早い順に券の回数ぶんだけ残し、あふれたぶんを
--   回数券から外す ＋ コース「無料」＋ 金額0円
-- に変える。コースを「無料」にしておかないと、
-- 単価のフォールバックで顧客の都度単価を拾ってしまい、請求に乗ってしまう。
--
-- キャンセルの回は券を消費しないので、はじめから数に入れない。
-- 何回流しても安全（2回目はあふれが無くなるので0件）。

with ranked as (
  select l.id,
         p.total_count,
         row_number() over (
           partition by l.session_pass_id
           order by l.scheduled_at, l.created_at, l.id
         ) as rn
    from public.lessons l
    join public.session_passes p on p.id = l.session_pass_id
   where l.status is distinct from 'cancelled'
),
overflow as (
  select id from ranked where rn > total_count
)
update public.lessons l
   set session_pass_id = null,
       payment_type    = 'single',
       course          = '無料',
       amount          = 0,
       note            = case
                           when coalesce(l.note, '') = ''        then '回数券の回数を超えた分（無料レッスン）'
                           when l.note like '%無料レッスン%'      then l.note
                           else l.note || E'\n回数券の回数を超えた分（無料レッスン）'
                         end,
       updated_at      = now()
  from overflow o
 where l.id = o.id;

-- 残回数を数え直す。あふれが無くなったので、さっきは対象外だった2枚もここで0になる。
-- ありえない値（マイナス・総回数超え）は書かない。
update public.session_passes p
   set remaining_count = v.correct, updated_at = now()
  from (
    select p2.id, p2.total_count,
           p2.total_count - count(l.id) filter (where l.status is distinct from 'cancelled') as correct
      from public.session_passes p2
      left join public.lessons l on l.session_pass_id = p2.id
     group by p2.id, p2.total_count
  ) as v
 where p.id = v.id
   and v.correct between 0 and v.total_count
   and p.remaining_count is distinct from v.correct;
