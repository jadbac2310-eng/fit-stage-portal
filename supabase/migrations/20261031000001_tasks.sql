-- やること（会社のタスク一覧）。2026-10-31
--
-- 経営まわりの「やること」をポータルに置いて、ログインした全員が見て更新できるようにする。
-- ジャンル・担当・期限・状況・メモ。期限と担当があればスケジュールにも入る（personal_events）。
-- 何回流しても同じ結果になる（SQL Editor で Run する）。

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null unique,
  category     text not null default 'その他',   -- ホテル営業 / サイト・SEO / 経理 / 採用 / 法人 / 新店舗 / その他
  assignee_id  uuid references public.members(id) on delete set null,
  due_on       date,
  status       text not null default '未着手',   -- 未着手 / 進行中 / 完了
  memo         text,
  sort_order   integer not null default 100,
  event_id     uuid,                             -- スケジュールに入れた予定（personal_events.id）
  completed_at timestamptz,
  created_by   uuid references public.members(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_tasks_status   on public.tasks (status, sort_order);
create index if not exists idx_tasks_assignee on public.tasks (assignee_id);

alter table public.tasks enable row level security;

-- 最初の一覧（2026-10-31 時点）。すでにあれば何もしない
insert into public.tasks (category, sort_order, title, memo, status, completed_at) values
  -- 直近
  ('ホテル営業', 10, '賠償責任保険に加入する（ホテル営業の前）', '会社では入らず、トレーナー個人の団体保険（JHCA・JATIなど）で対応する方針', '未着手', null),
  ('ホテル営業', 20, 'パティーナ大阪向け企画書（日本語・英語）を作る', '尚樹とサムの2人で持参。内容：ゲスト向け出張パーソナル（館内ジム 7:00〜22:00）がメイン、スタッフ向けも少し。予約はホテル経由・ゲスト直接の両方。料金は1名60分 ¥18,000（税・交通費込み）、2名同時は2人目＋¥8,000、キャンセルは前日21時まで無料・以降100%', '未着手', null),
  ('ホテル営業', 30, 'ホテル営業ページの18軒に担当を割り当てる', null, '未着手', null),
  ('ホテル営業', 40, '名刺を作る（尚樹・サム・あいみ・渡辺）', null, '未着手', null),
  ('ホテル営業', 50, 'パティーナ大阪（松村様）へ写真修正の報告メールを送る', 'HPのパティーナ大阪の写真は修正済み。今後ホテルの写真・名称は事前許可を取る', '完了', now()),
  -- 採用
  ('採用', 110, 'カールと庄内店で指導チェック＋写真撮影（11/13(金)15:00 梅田集合）', 'やりとりは日本語で', '完了', now()),
  -- サイト・SEO
  ('サイト・SEO', 210, '作業ログに「ブログ→出張ページのリンク」の反映日を記入する', null, '未着手', null),
  ('サイト・SEO', 220, 'Search Consoleで庄内店ページと /en/recruit/ のインデックス登録をリクエストする', null, '未着手', null),
  ('サイト・SEO', 230, '応募フォームをテスト送信して、LINEとメールに届くか確認する', null, '完了', now()),
  ('サイト・SEO', 240, '庄内店のGoogleマップ掲載をFWMと相談する', null, '完了', now()),
  ('サイト・SEO', 250, 'HPの表記ゆれを判断する（ホームジム費用・機材購入特典・入会金の日英差）', 'ホームジム費用：FAQ・llms.txtは「標準セット150万円〜」、料金ページは75万〜120万円／機材購入者特典「初回レッスン無料」が無料体験と紛らわしい／入会金：英語は「なし」、日本語は「通常¥11,000→現在0円」', '未着手', null),
  ('サイト・SEO', 260, '11月下旬に検索順位を再計測する（ラッコ・同じ10キーワード・同じ設定）', '10/26の基準値と比較。本命は「パーソナルジム 豊中」「パーソナルジム 江坂」', '未着手', null),
  -- 経理
  ('経理', 310, 'SAKANE ONE 1期目の決算・申告を出す', 'freee（法人）で自分でやる。法人口座はfreee連携済み', '未着手', null),
  ('経理', 320, '個人事業（FIT STAGE）用のfreeeスタンダードを契約する（インボイス対応）', null, '未着手', null),
  ('経理', 330, 'ポータルのCSVをfreeeに取り込む流れを作る', null, '未着手', null),
  -- 補助金
  ('その他', 410, '小規模事業者持続化補助金（第20回・一般型）の申請準備', 'FIT STAGE（個人事業）で申請する', '未着手', null),
  -- 法人
  ('法人', 510, '井上塗装店との法人契約書（GMOサイン）の締結を進める', '契約開始は2026-10-10', '完了', now()),
  -- 新店舗
  ('新店舗', 610, '豊中4店舗目の準備', '軌道に乗っていれば2027年2月、遅くとも春先にオープン', '未着手', null),
  ('その他', 620, 'SAKANE ONEの定款目的・本店住所の登記変更', 'ホテル営業は個人のFIT STAGEで進める方向。登記変更は並行で', '未着手', null)
on conflict (title) do nothing;

-- 動作確認：ジャンル別の件数
select category, status, count(*) from public.tasks group by category, status order by category, status;
