-- 代表個人の米国株イベント（決算・FOMC）をスケジュールに載せる。
-- 非公開（is_private）なので、代表本人と管理者だけに見える。notify=true なので
-- 既存の「開始30分前のLINEリマインド」がそのまま効く。
-- 何回流しても安全（同じ件名・同じ開始時刻があれば入れない）。
-- 日時はすべて日本時間。NBISの決算日は会社発表待ちのため仮置き（確定したら画面で直す）。

with owner as (
  select id from public.members
  where name like '%尚樹%' or name like '%坂根%'
  order by is_admin desc, created_at asc
  limit 1
),
ev(title, start_at, end_at, all_day, location, memo, color) as (
  values
    ('🇺🇸 米国市場 冬時間へ（取引 23:30〜翌6:00）',
      timestamptz '2026-11-02 00:00+09', null, true, null,
      '夜便は22:10、寄り付きは23:30に。', 'gray'),

    ('📊 AAOI 決算（今夜・引け後発表）寄り前チェック',
      timestamptz '2026-11-05 22:30+09', timestamptz '2026-11-05 23:30+09', false, null,
      '発表は日本時間 11/6(金) 6:10頃。今夜は買わない（決算またぎは博打）。ポータル: https://invest-portal-ten.vercel.app', 'red'),

    ('📊 AAOI 決算結果チェック（売上2.6億ドル超・Q4見通し4億ドル超？）',
      timestamptz '2026-11-06 08:00+09', timestamptz '2026-11-06 08:30+09', false, null,
      '見る数字: Q3売上（目安2.68億ドル）、Q4売上見通し（目安4.2〜4.3億ドル）、1.6T出荷の進み具合、増資の話が出ないか。朝便7:40と合わせて確認。', 'red'),

    ('📈 AAOI 決算翌日の寄り付き（反応を見る）',
      timestamptz '2026-11-06 23:30+09', timestamptz '2026-11-07 00:30+09', false, null,
      '翌日プラスで引けるか。50日線(90ドル前後)を上抜けるまでは様子見。', 'red'),

    ('📊 NBIS 決算（寄り前発表・日程は仮）',
      timestamptz '2026-11-11 21:00+09', timestamptz '2026-11-11 22:00+09', false, null,
      '発表は11/10〜12のどこか、日本時間の夜（寄り前）。確定したらこの予定を直す。見る数字: Q3売上（目安9.3億ドル）、調整後EBITDA利益率、資金調達の進捗、Capex計画の修正有無。', 'purple'),

    ('📈 NBIS 決算当日の寄り付き（反応を見る）',
      timestamptz '2026-11-11 23:30+09', timestamptz '2026-11-12 00:30+09', false, null,
      '資金調達OK・Capex維持なら翌日以降に検討。180ドル(200日線)回復が安全ライン。', 'purple'),

    ('🏦 FOMC 金利発表（日本時間 12/10 早朝4:00）結果チェック',
      timestamptz '2026-12-10 08:00+09', timestamptz '2026-12-10 08:30+09', false, null,
      '12月利上げが織り込み済み。「打ち止め」のニュアンスが出たら株に追い風。', 'amber')
)
insert into public.personal_events
  (member_id, title, all_day, start_at, end_at, location, memo, color, participant_ids, notify, is_private)
select o.id, e.title, e.all_day, e.start_at, e.end_at, e.location, e.memo, e.color, '{}'::uuid[], true, true
from ev e cross join owner o
where not exists (
  select 1 from public.personal_events p
  where p.member_id = o.id and p.title = e.title and p.start_at = e.start_at
);

-- 確認用: 入った件数（7件のはず）
select count(*) as us_stock_events
from public.personal_events p
join (select id from public.members where name like '%尚樹%' or name like '%坂根%') o on o.id = p.member_id
where p.title like '%AAOI%' or p.title like '%NBIS%' or p.title like '%FOMC%' or p.title like '%米国市場%';
