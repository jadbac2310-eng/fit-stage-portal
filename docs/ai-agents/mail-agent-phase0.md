# AIメール担当 フェーズ0：調査と設計（2026-11-21）

> 設計だけ。コードはまだ書いていない。尚樹のOKのあとフェーズ1へ進む。
> この文書は、fit-stage-agents リポジトリができたらそちらの `docs/` へ移す。

## 1. 調べたこと

### 1-1. info@fitstage.jp のメール
- **お名前.comのメールではない。** ポータルの記録（AGENTS.md、2026-11-14）では：
  - MX は **ImprovMX**（転送専用のサービス。メール箱は持たない）
  - 届いたメールは **FIT STAGE の Gmail `fitstage.000@gmail.com`** へ転送
  - SPF に `_spf.google.com` が入っている。Gmail で「他のアドレスから送信」に info@ を登録済み（2026-10-25 から送れている）
  - ポータルの体験の確定メールは、すでにこの方法で info@ から送っている（`lib/mailer.ts` の `store`）
- ⚠️ このセッションの環境からは DNS を直接引けなかった（外へのアクセス制限）。上は記録からの判断。尚樹にお名前.comの DNS 画面で MX を確認してもらう。
- **IMAP/SMTP で扱えるか → 扱える（Gmail 側で）**
  - 受信：`imap.gmail.com:993`（IMAP の IDLE で待ち受け）。ImprovMX 自体には IMAP は無い
  - 送信：`smtp.gmail.com:465`、差出人 info@fitstage.jp（今と同じ）
  - 認証：fitstage.000 のアプリパスワード（ポータルの `STORE_GMAIL_APP_PASSWORD` と同じ種類。担当ごとに別のアプリパスワードを作るのがよい）
  - Gmail 側で「宛先が info@fitstage.jp → ラベル `AI-inbox`」のフィルタを作り、ワーカーはそのラベルだけを読む（ほかのメールを AI に見せない）
- 気をつけること
  - 返信を Gmail の SMTP で送ると、DKIM 署名は gmail.com になる。fitstage.jp に DMARC を厳しく設定すると迷惑メール扱いになり得る（今は確定メールが届いているので現状維持でよい）
  - Formspree の通知メールも同じ Gmail に届く。お問い合わせは下のルートで受けるので、Formspree のメールは仕分けから外す（二重にしない）

### 1-2. HP のお問い合わせフォーム（/contact/）の送り先
- 今は **2か所へ同時に** 送っている：
  1. Formspree（`formspree.io/f/xpqkrzjo`）→ FIT STAGE の Gmail にメール
  2. HP の `api/contact.js`（Vercel Function）→ ポータル `/api/contact-webhook` → 管理者へ LINE（DBには保存していない）
- **つなぎ方の提案：ポータルの受け口で Supabase に1行入れる（HPは変えない）**
  - `/api/contact-webhook` が、今のLINE通知に加えて `mail_messages` に `source = 'contact_form'` で保存
  - VPS のワーカーは、メールと同じ表からそれを拾って仕分ける（返信は相手のメールアドレスへ info@ から新しいメールで）
  - HP の変更が要らない／合言葉もそのまま／ワーカーに外から入ってくる口を開けなくてよい
  - フェーズ1になったら「受付のLINE」はまとめ通知に吸収するか尚樹に聞く

### 1-3. LINE
- **スタッフ用の LINE 公式アカウントはもうある**（ポータルの通知に使用中。Webhook はポータルの `/api/line/webhook`）
- 1つの公式アカウントに Webhook は1つだけ → 尚樹からの「OK 12」「NG 12」「停止」も **ポータルの Webhook で受けて Supabase に書く**。ワーカーはそれを読んで動く
- Reply API（返事）は無料で数に入らない。数に入るのはまとめ通知（push）だけ：1日3回 ≒ 月90通＋緊急
- ⚠️ 無料プランは月200通。今の朝の通知・リマインドなどで、すでにどれだけ使っているかを確認したい

## 2. VPS の比較（2GB・Linux。価格は検索で見た目安。契約前に公式で確認）

| | 月額の目安 | 中身 | ひとこと |
|---|---|---|---|
| **Xserver VPS 2GB** | 約 ¥990〜（830円の表示も） | 2〜3コア・NVMe 50GB・初期費用0 | いちばん安い。日本語の管理画面 |
| さくらのVPS 2G | ¥1,848（大阪）／年払い石狩で約¥1,594 | 3コア・SSD 100GB | 老舗で安定。大阪あり |
| ConoHa VPS 2GB | 不明（2026年に料金表が変わり、2GBの現行価格を確かめられなかった） | 2コア・NVMe 100GB（旧） | 確認が取れないので外す |

- **おすすめ：Xserver VPS 2GB**。ワーカーは常駐するだけで軽く、性能差は効かない。安さで選んでよい。
- OS は Ubuntu 24.04、pm2 で自動再起動（Docker より簡単で、2GBでも余裕）。
- 外から入る口は SSH だけ（LINE・フォームはポータルが受けるので、VPS にWebの口は要らない）。

## 3. 全体の構成

```mermaid
flowchart LR
  subgraph 外
    C[お客様のメール] -->|info@fitstage.jp| IMX[ImprovMX 転送]
    F[HP お問い合わせ /contact/] --> HPAPI[HP api/contact.js]
    N[尚樹のLINE]
  end
  IMX --> G[(Gmail fitstage.000<br/>ラベル AI-inbox)]
  HPAPI --> PW[ポータル /api/contact-webhook]
  N -->|OK・NG・停止| LW[ポータル /api/line/webhook]

  subgraph VPS["VPS（fit-stage-agents・pm2）"]
    W1[agents/mail<br/>受信→仕分け→下書き→送信]
    CORE[core<br/>AI呼び出し・ログ・承認・通知・費用・停止]
    W1 --- CORE
  end

  G -->|IMAP IDLE| W1
  PW --> DB[(Supabase)]
  LW --> DB
  DB <--> CORE
  CORE -->|Claude API<br/>仕分け Haiku / 下書き Sonnet| AI[Anthropic]
  W1 -->|SMTP 差出人 info@| G2[Gmail 送信]
  CORE -->|まとめ通知 1日3回＋緊急| LINEAPI[LINE Messaging API]
  DB <--> P[ポータル<br/>AIメール担当・承認待ち・緊急停止]
```

### fit-stage-agents のフォルダ（案）
```
fit-stage-agents/
  core/        ai.ts（Claude呼び出し＋使った額を記録）・log.ts・approval.ts・notify.ts（LINEまとめ）・killswitch.ts・budget.ts・db.ts
  agents/mail/ imap.ts・classify.ts・draft.ts・send.ts・rules.ts・index.ts
  knowledge/   faq.md
  ecosystem.config.cjs（pm2）  .env.example（.env はコミットしない）
```
次の担当（HP・マーケ…）は `agents/<名前>/` を足すだけで、core を使い回す。

### 仕分けの流れ
1. 受信 → `mail_messages` に保存（Message-ID で重複を防ぐ）
2. 機械的に先に外す：noreply・`Auto-Submitted`・`List-Id`・`Precedence: bulk`・Formspree 通知 → 「無視」（AIを呼ばない＝費用0）
3. Haiku で仕分け（faq.md を渡す）：定型／要確認／営業／無視＋理由＋使った faq の項目。**自信が低い・迷ったら要確認**
4. フェーズ1：ログとまとめ通知だけ。送信のコードは入れない
5. フェーズ2：要確認 → Sonnet で下書き → 承認待ち（ポータル＋LINE）→ OK/修正/NG
6. フェーズ3：定型 → Sonnet で返信 → 自動送信（上限・スレッド1回・停止を確認してから）

### 安全装置
- **緊急停止**：`agent_settings.kill_switch`。ポータルのボタン／LINEで「停止」。ワーカーは送る直前に毎回読む。「再開」はポータルのみ（LINEの打ち間違いで動き出さないように）
- **スレッドに自動返信は1回**：`mail_threads.auto_replied_count`。送るメールに `Auto-Submitted: auto-replied` を付け、相手の自動返信には返さない
- **1日の上限**：`auto_reply_daily_limit`（初期10。フェーズ3の最初の2週間は5）
- **月の上限**：`monthly_budget_usd`。使った額は呼び出しごとに `agent_api_usage` へ。8割でLINE（1回だけ）、10割でAIを止める（受信と保存は続ける）
- **全部ログ**：受信・仕分け・下書き・送信・承認者を `agent_events` に
- **生きているか**：ワーカーが5分ごとに `heartbeat_at` を更新。30分止まったら、ポータルの既存の cron が LINE で知らせる
- 鍵は全部 `.env`（VPS）と Vercel の環境変数。リポジトリには `.env.example` だけ

## 4. Supabase に足すテーブル（案。全部 RLS 有効・ポリシーなし）

| テーブル | 中身 |
|---|---|
| `agent_settings` | 1行の設定：kill_switch・stopped_at/by・auto_reply_daily_limit・monthly_budget_usd・phase・heartbeat_at |
| `mail_threads` | スレッド：相手のアドレス・件名・Gmail のスレッドID・自動返信の回数・最後のやりとり |
| `mail_messages` | 受信/送信の1通：source（email / contact_form）・message_id（一意）・差出人・宛先・件名・本文・言語・受信日時 |
| `mail_classifications` | 仕分け結果：category・理由・自信・使ったfaq・モデル。**尚樹の正解 `human_category`**（フェーズ1の精度を測る） |
| `mail_drafts` | 下書き：本文・状態（承認待ち/修正して承認/NG/送信済み/失敗）・承認者・承認した場所（portal/line）・送信日時 |
| `agent_events` | すべての処理のログ（agent='mail'・種類・対象ID・内容・誰が） |
| `agent_api_usage` | Claude の使用量：日時・モデル・入力/出力トークン・金額（ドル） |
| `agent_line_inbox` | LINE から届いた指示（OK 12・NG 12・停止）と処理したか |

- 体験・顧客の表とはつながない（フェーズ1では）。必要になったら顧客のメールで突き合わせる。

## 5. ポータルに足すページ（案）

- **`/ai-mail` AIメール担当**（管理者のみ。目次の「会社」→ AI部署の下）
  - 上に状態：稼働中/停止中・最後に動いた時刻・今日の自動返信 n/10・今月の AI 代 $x / $y
  - **緊急停止ボタン**（赤）と再開
  - 仕分け一覧：日時・差出人・件名・仕分け・理由。行を開くと本文と、正解を直すボタン（精度の集計に使う）
  - ログ（agent_events）
- **`/ai-mail/approvals` 承認待ち**：下書きの本文・元のメール・使った faq。「OKで送る」「直して送る」「NG」
- AI部署（`/ai-office`）にメール担当の部署を足す（フェーズ1が動くまで「準備中」）

## 6. 月額の見積もり

| 項目 | 月額 |
|---|---|
| VPS（Xserver 2GB） | 約 ¥990 |
| Claude API | 約 ¥300〜600（下の計算） |
| Supabase・Vercel・ImprovMX・Gmail | ¥0（今のまま） |
| LINE | ¥0（月200通に収まれば。超えるならライトプラン 約¥5,000） |
| **合計** | **約 ¥1,500／月**（LINE が収まる場合） |

Claude の計算（2026-11 の単価：Haiku 5.5 $0.10/$0.50、Sonnet 5.5 $2/$10 ／100万トークン）
- 仕分け：月500通 × 入力4,000（faq込み）＋出力200 → 約 $0.25
- 下書き・返信：月120通 × 入力6,000＋出力800 → 約 $2.4
- 合計 約 $3（約 ¥450）。faq.md はキャッシュして安くする。月の上限は **$10** を提案

## 7. 尚樹にやってもらうこと（手順つき）

1. **DNS の確認**（5分）：お名前.com Navi → ドメイン → DNS設定 → fitstage.jp の MX が `mx1.improvmx.com`/`mx2.improvmx.com` か見る（スクショでOK）
2. **GitHub に空のリポジトリ `fit-stage-agents` を作る**（非公開）→ このセッションに追加できるようにする（Claude からはリポジトリを作れない設定のため）
3. **faq.md を渡す**（添付が届いていなかった）
4. **Gmail（fitstage.000@gmail.com）の準備**
   - 設定 → 転送とPOP/IMAP → IMAP を有効
   - フィルタ：To に `info@fitstage.jp` → ラベル `AI-inbox` を付ける
   - Google アカウント → セキュリティ → 2段階認証 → アプリパスワード → 名前「ai-mail」で作成（16文字。VPS にだけ入れる）
5. **VPS の契約**：Xserver VPS → 2GB・Ubuntu 24.04・東京か大阪 → root パスワードと SSH 鍵を設定 → IP を教える（鍵の中身は送らない。入れ方は別途案内）
6. **Anthropic の API キー**：console.anthropic.com → Settings → API Keys → 「fit-stage-agents」で作成。Billing → 月の上限（例 $20）も設定しておく（二重の安全）
7. **LINE の確認**：LINE Official Account Manager → 分析/利用状況 → 今月の送信数を教える
8. Supabase：フェーズ1で作るテーブルの SQL を渡すので、SQL Editor で Run（いつもどおり）
