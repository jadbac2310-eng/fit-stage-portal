# FIT STAGE Admin

## 開発サーバーの起動

```bash
npm run dev
```

## 環境変数

`.env.local` に以下を設定する。

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
ANTHROPIC_API_KEY=sk-ant-...

# Supabase CLI 用パーソナルアクセストークン（後述）
SUPABASE_ACCESS_TOKEN=sbp_...
```

## Supabase にテーブルを追加する手順

### 1. マイグレーションファイルを作成する

`supabase/migrations/` に `YYYYMMDDHHMMSS_<説明>.sql` という名前で SQL ファイルを作成する。

```sql
-- 例: supabase/migrations/20260501000001_create_foo.sql
create table if not exists public.foo (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);
```

### 2. リモートに適用する

```bash
SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push
```

`.env.local` に `SUPABASE_ACCESS_TOKEN` が設定されていれば、以下でも可。

```bash
export $(grep SUPABASE_ACCESS_TOKEN .env.local | xargs) && npx supabase db push
```

### アクセストークンの更新

トークンは期限切れになることがある。その場合は以下の手順で更新する。

1. <https://supabase.com/dashboard/account/tokens> を開く
2. **Generate new token** で新しいトークンを発行
3. `.env.local` の `SUPABASE_ACCESS_TOKEN` を更新する
