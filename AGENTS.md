<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 開発フロー（オーナー指示・全作業で共通）

- **main ブランチで直接作業する。** 機能ブランチ（`claude/...` など）は作らない。
- 作業が終わったら main にコミットして `git push origin main`。レビュー待ちにせず、そのまま本番へ反映してよい。
- **プルリクエストは作らない。** 明示的に「PR作って」と言われたときだけ作る。
- DB を変更したら `supabase/migrations/` にマイグレーションを追加し、適用には
  `npx supabase db push` が必要なことを最後に必ず伝える（アプリのデプロイとは別作業のため）。
