<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 開発フロー（オーナー指示・全作業で共通）

- **main ブランチで直接作業する。** 機能ブランチ（`claude/...` など）は作らない。
- 作業が終わったら main にコミットして `git push origin main`。レビュー待ちにせず、そのまま本番へ反映してよい。
- **プルリクエストは作らない。** 明示的に「PR作って」と言われたときだけ作る。
- DB を変更したら `supabase/migrations/` にマイグレーションを追加する（記録用）。
- **`npx supabase db push` は使わない・勧めない。**
  マイグレーション履歴が途中からしか記録されていないため、適用済みの基幹テーブル
  （customers・lessons など）を「未適用」と誤認して作り直そうとする。
- DB への反映は、**何回流しても安全な SQL**（`create table if not exists`・`add column if not exists`・
  `on conflict do nothing` など）を用意し、尚樹に **Supabase の SQL Editor に貼って Run** してもらう。
  アプリのデプロイとは別作業なので、反映が必要なことを最後に必ず伝える。
- SQL Editor で反映したら、下の「反映済みのDB変更」に日付とファイル名を書き足す。

### 反映済みのDB変更（SQL Editor で手動適用したもの）

- 2026-10-23｜`20261023000001_sales_targets.sql`・`20261023000002_sales_targets_handover.sql`（ホテル営業ページ。18軒投入済み）
- 2026-10-23｜`20261023000003_sales_flow_companions.sql`（ホテル営業：状況を テレアポ→企画書作成→訪問 に整理、訪問の付き添い companion_ids）

## セッションの担当分け（2つのリポジトリ）

FIT STAGE には2つのリポジトリがあり、セッションを分けて作業している。

| リポジトリ | 中身 | 基本の担当 |
|---|---|---|
| `fit-stage` | 公開サイト fitstage.jp | **HPのセッション** |
| `fit-stage-portal`（このリポジトリ） | 社内ポータル | **ポータルのセッション** |

- 基本は上の担当に沿って作業する。**担当外のリポジトリを触るときは、尚樹に一言確認してから**。
- 確認が取れれば、担当外でも作業してよい（片方だけ直して不整合が残るほうが困るため）。
- **両方にまたがる変更をしたときは、両方のリポジトリに同じ内容を書き残す。**
  下の「HPとの連携」と、HP側 `CLAUDE.md` の「ポータルとの連携」を、必ずセットで更新する。

## HPとの連携（変更するときは必ず両方を直す）

HPのフォームの内容は、メール（Formspree）とは別にポータルへも送られてくる。
**どちらか片方だけ直すと、お客様には成功画面が出るのにポータルには何も入らない、という壊れ方をする。**

| 用途 | HP側 | ポータル側 |
|---|---|---|
| 体験予約 | `api/reserve.js` | `app/api/reserve-webhook/route.ts` |
| 入会申し込み | `api/join.js` | `app/api/join-webhook/route.ts` |
| 英語トレーナーの応募（LINE通知のみ・DB保存なし） | `api/recruit.js` | `app/api/recruit-webhook/route.ts` |

- 合言葉はHP側の環境変数 `PORTAL_WEBHOOK_SECRET`、ポータル側は `RESERVE_WEBHOOK_SECRET`。
  **同じ文字列**にすること。ヘッダ `x-webhook-secret` で検証する。
- **受け口を増やしたら、必ず `middleware.ts` の `PUBLIC_PATHS` に追加する。**
  入れ忘れるとログイン画面へ転送され、転送先が正常に返るのでHP側からは成功に見えてしまう。
  （入会申し込みで実際に起きた。2026-10-18 修正）
- 応募の通知は管理者（LINE連携済み）へ送る。`RECRUIT_NOTIFY_MEMBER_IDS` で送信先を指定、`LINE_NOTIFY_RECRUIT=off` で停止できる。
  応募者はお客様ではないので、顧客データには入れない。
- フォームの項目名（日本語）→ こちらの項目名（英語）の変換は、HP側 `api/*.js` の1か所だけで行う。
  **項目が増えたら、HP側の変換・こちらの受け口・DBの列の3つをまとめて直す。**
