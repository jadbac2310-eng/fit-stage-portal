-- 「営業資料」フォルダがなければ wiki_pages の folder 列に自動作成されるため不要
-- Wikiページ：営業〜指導開始フロー
insert into public.wiki_pages (title, slug, folder, category, content)
values (
  '営業〜指導開始フロー',
  'sales-flow',
  '営業資料',
  '社内資料',
  E'# FIT STAGE 営業〜指導開始フロー\n\nアポ取りから指導開始まで、各ステップのシステム対応状況をまとめたフローです。\n\n[📄 PDFをダウンロード](/docs/FIT_STAGE_flow_system.pdf)\n\n<iframe\n  src="/docs/FIT_STAGE_flow_system.pdf"\n  width="100%"\n  height="900"\n  style="border:none; border-radius:8px; margin-top:12px;"\n></iframe>\n\n## フロー概要\n\n| STEP | 内容 | 担当 | システム |\n|---|---|---|---|\n| 01 | アポ取り | 営業 | ✓ 実装済み |\n| 02 | 本部へ報告 | 営業→本部 | ✓ 実装済み |\n| 03 | トレーナーアサイン | 本部 | ✓ 実装済み |\n| 04 | 体験レッスン | トレーナー | ✓ 実装済み |\n| 05 | クロージング・契約 | 営業 | ✓ 実装済み |\n| 06 | 契約確認・請求書発行 | 本部 | △ 一部未実装 |\n| 07 | 入金確認 | 本部 | — システム外 |\n| 08 | 指導開始 | トレーナー | ✓ 実装済み |\n| 09 | 毎月の運用 | 本部・全員 | △ 一部未実装 |\n'
)
on conflict (slug) do update
  set
    title     = excluded.title,
    folder    = excluded.folder,
    category  = excluded.category,
    content   = excluded.content,
    updated_at = now();
