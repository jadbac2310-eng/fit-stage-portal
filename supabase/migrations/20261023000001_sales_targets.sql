-- 営業先リスト（まずはホテル向けパーソナルの営業）。
--
-- 営業担当がスマホで見て、状況・次にやること・やりとりを書き込む。
-- 担当者はあとから割り当てるので空でよい。
-- kind 列を持たせておき、ホテル以外（法人など）の営業先も同じ仕組みで増やせるようにする。

create table if not exists public.sales_targets (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null default 'ホテル',
  priority        text not null default '次点',   -- 本命 / 次点 / 国内系 / 京都 / 後回し
  sort_order      integer not null default 0,
  name            text not null unique,
  area            text,
  contact_point   text,                            -- 想定の窓口（コンシェルジュなど）
  pitch           text,                            -- 提案の切り口
  -- 下調べ（2026年10月 公式サイト中心に調査）
  has_pt          text,                            -- あり / なし / 記載なし / 不明
  single_session  text,                            -- 可 / 不可 / 一部可 / 不明 / —
  english         text,                            -- 可 / 予約のみ / 不明 / —
  research_note   text,
  research_url    text,
  -- 営業の進み具合
  assignee_id     uuid references public.members(id) on delete set null,
  status          text not null default '未着手',
  next_action     text,
  next_action_on  date,
  contact_person  text,                            -- 先方の担当者名
  contact_info    text,                            -- 電話・メールなど
  memo            text,
  created_by      uuid references public.members(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_sales_targets_assignee on public.sales_targets (assignee_id);

-- やりとりの記録（電話した・訪問した・資料を送った など）。時系列で積む
create table if not exists public.sales_target_logs (
  id          uuid primary key default gen_random_uuid(),
  target_id   uuid not null references public.sales_targets(id) on delete cascade,
  body        text not null,
  created_by  uuid references public.members(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_sales_target_logs_target on public.sales_target_logs (target_id, created_at desc);

-- ほかのテーブルと同じく、外からの直接アクセスは閉じる（アプリは service role で読み書き）
alter table public.sales_targets     enable row level security;
alter table public.sales_target_logs enable row level security;

-- 最初のリスト（18軒）。すでにあれば何もしない
insert into public.sales_targets
  (priority, sort_order, name, area, contact_point, pitch, has_pt, single_session, english, research_note, research_url, status)
values
  ('本命', 10, 'ウォルドーフ・アストリア大阪', '梅田', 'コンシェルジュ', '2025年開業の新しいホテル。語学対応と客室への出張を前面に',
   'あり', '不明', '不明', '目的に合わせてトレーナーを「手配」する形。外部トレーナーの枠に入れる可能性あり。料金は非公開', 'https://www.hilton.com/ja/hotels/osawawa-waldorf-astoria-osaka/amenities/', '未着手'),
  ('本命', 20, 'コンラッド大阪', '中之島', 'コンシェルジュ', '海外客が多い。前日〜当日予約OKを強調',
   'あり', '不明', '不明', '事前予約制のインストラクターによるセッション。提供者・料金は非公開', 'https://www.hilton.com/ja/hotels/osacici-conrad-osaka/amenities/', '未着手'),
  ('本命', 30, 'ザ・リッツ・カールトン大阪', '西梅田', 'コンシェルジュ', '長期滞在の海外客に継続セッションを提案',
   '不明', '不明', '不明', 'スパのサービス一覧に「フィットネスカウンセリング」の名前だけ載っている', 'https://www.ritzcarlton.com/ja/hotels/osarz-the-ritz-carlton-osaka/spa/', '未着手'),
  ('本命', 40, 'インターコンチネンタルホテル大阪', '梅田', 'コンシェルジュ', 'ビジネス客の朝・夜の時間帯に対応できる点を押す',
   '不明', '不明', '不明', '設備一覧に「スポーツトレーナー」の項目があるだけ。内容・料金の記載なし', 'https://www.ihg.com/intercontinental/hotels/jp/ja/osaka/osaha/hoteldetail/amenities', '未着手'),
  ('本命', 50, 'セントレジスホテル大阪', '本町', 'バトラー／コンシェルジュ', 'バトラー経由の手配でホテル側の手間ゼロ',
   '記載なし', '—', '—', '宿泊者専用のジム（24時間・無料）だけ。トレーナーの記載なし', 'https://www.marriott.com/ja/hotels/osaxr-the-st-regis-osaka/overview/', '未着手'),
  ('本命', 60, 'パティーナ大阪', '梅田', '面談済みの担当者', '企画書を持参すれば話を聞くと言われている。館内の既存サービスには触れず、語学対応を押す',
   'あり', '一部可', '不明', 'ホテルのトレーナーは「パーソナル＋コントラストセラピー」105分41,800円で単発可（雑誌記事の情報）。スパーブルームは年契約＋パティーナ会員のみ', 'https://patinahotels.com/osaka/wellbeing/facilities', '企画書準備中'),
  ('次点', 110, 'ザ・ゲートホテル大阪 by HULIC', '心斎橋', 'コンシェルジュ', '2026年6月開業。サービスを増やす提案として',
   '記載なし', '—', '—', '27階の宿泊者専用フィットネスだけ（6:00〜23:00）', 'https://www.gate-hotel.jp/osaka/', '未着手'),
  ('次点', 120, 'W大阪', '心斎橋', 'コンシェルジュ', '若めの海外客。旅先のトレーニング体験として',
   'あり', '不明', '不明', '「FITWET+ Personal Training」（パーソナル＋プールのセット）。料金・トレーナーは非公開。問い合わせ 06-6484-5355', 'https://www.marriott.com/ja/hotels/osaow-w-osaka/spa/', '未着手'),
  ('次点', 130, 'スイスホテル南海大阪', 'なんば', 'コンシェルジュ', '関空からの短期滞在客に単発セッション',
   'あり', '不明', '不明', '「Pürovel Spa & Sport」に専属トレーナーのチームあり。追加料金制で金額は非公開', 'https://swissotelnankaiosaka.com/spa-sport/', '未着手'),
  ('国内系', 210, '帝国ホテル大阪', '桜ノ宮', '宿泊営業／ゲストリレーション', 'シニア客に機能改善・健康づくりを推す',
   'あり', '不可', '不明', '会員制クラブの会員限定（50分）か、パーソナル付き宿泊プランでしか受けられない', 'https://www.imperialhotel.co.jp/en/osaka/fitness-spa', '未着手'),
  ('国内系', 220, 'リーガロイヤルホテル大阪', '中之島', '宿泊営業／ゲストリレーション', '常連・シニア客の健康づくり',
   '不明', '不明', '不明', '会員制「ロイヤルヘルスクラブ」に「運動指導」と書いてあるだけ。宿泊者用ジムは機器のみ', 'https://www.rihga.co.jp/osaka/fitness/', '未着手'),
  ('国内系', 230, 'ホテルニューオータニ大阪', '大阪城', '宿泊営業／ゲストリレーション', 'ランニング客・長期滞在向け',
   '不明', '不明', '不明', 'ジムの利用料だけ載っている（宿泊者3,850円）', 'https://www.newotani.co.jp/osaka/facility/club-exercise/', '未着手'),
  ('京都', 310, 'カペラ京都', '祇園', 'コンシェルジュ／スパ', 'パティーナと同じカペラグループ。パティーナで実績を作ってから紹介ルートで',
   'あり', '不明', '不明', '「プライベートトレーニング」の記載のみ。トレーナーの情報なし。窓口はアウリガスパ 075-606-5817', 'https://capellahotels.com/jp/capella-kyoto/wellness', '未着手'),
  ('京都', 320, '帝国ホテル 京都', '祇園', 'コンシェルジュ', '2026年3月開業の小規模ラグジュアリー。パーソナルがないので提案しやすい',
   'なし', '—', '—', 'スタッフが常駐しない宿泊者専用ジムだけ（公式で確認）', 'https://www.imperialhotel.co.jp/kyoto/facility-access/wellness', '未着手'),
  ('京都', 330, 'シックスセンシズ京都', '東山', 'ウェルネス担当', 'ウェルネス志向の客層。語学対応で補完提案',
   'あり', '不明', '不明', '専属トレーナーあり。回数パス（5回81,000円〜）で宿泊していなくても買える。単発料金は非公開', 'https://www.sixsenses.com/en/hotels-resorts/asia-the-pacific/japan/kyoto/offers/wellness-pass', '未着手'),
  ('京都', 340, 'ザ・リッツ・カールトン京都', '鴨川', 'コンシェルジュ', '海外客が多い。パーソナルがないので提案しやすい',
   '記載なし', '—', '—', 'ジムだけ。スパはトリートメント中心', 'https://www.ritzcarlton.com/en/hotels/japan/kyoto/spa/fitness-center', '未着手'),
  ('京都', 350, 'パーク ハイアット 京都', '東山', 'コンシェルジュ', '海外客が多い。パーソナルがないので提案しやすい',
   '記載なし', '—', '—', 'ジムだけ', 'https://www.hyatt.com/en-US/spas/The-Spa-at-Park-Hyatt-Kyoto/fitness', '未着手'),
  ('後回し', 910, 'フォーシーズンズホテル大阪', '堂島', 'ウェルネス担当', '館内に専属トレーナーあり。語学・時間外の補完パートナーとして、他で実績ができてから',
   'あり', '可', '予約のみ', '60分20,000円・3日前までに予約。英語で予約はできるが指導の言語は不明', 'https://www.fourseasons.com/jp/osaka/services-and-amenities/wellness-program/', '保留')
on conflict (name) do nothing;
