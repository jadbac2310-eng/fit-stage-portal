import type { Metadata } from "next";
import { STORE_LINE_URL, FITSTAGE_TEL } from "@/lib/trial-confirm-mail";
import { loadTrialConfirm, type ConfirmView } from "./load";
import { ConfirmRunner } from "./confirm-runner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ご予約の確認｜FIT STAGE",
  robots: { index: false, follow: false },
};

/**
 * お客様用：体験の確定メールの「予約を確認しました」ボタンから開くページ（2026-11-14〜）。
 * ログイン不要（middleware の PUBLIC_PATHS）。リンクの署名で予約を特定する（lib/trial-confirm-token.ts）。
 * 開くと自動で「確認済み」を記録する（JavaScript で送る。リンクを先読みするだけのメールの安全チェックでは記録されない）。
 * ポータルの枠（目次など）は出さず、FIT STAGE のお知らせとして見せる。
 */
export default async function TrialConfirmPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const st = await loadTrialConfirm(t);

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-gray-900">
      <header className="bg-navy-900 border-b-2 border-gold-500">
        <div className="max-w-md mx-auto px-4 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wordmark-white.png" alt="FIT STAGE" className="h-7 w-auto" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        {st.kind === "invalid" ? (
          <Box>
            <h1 className="text-lg font-bold mb-2">リンクを確認できませんでした</h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              お手数ですが、メールのボタンをもう一度押していただくか、下記のLINE・お電話からご連絡ください。
            </p>
          </Box>
        ) : (
          <>
            {st.kind === "open" && t && <ConfirmRunner token={t} name={st.view.name} />}
            {st.kind === "done" && <Done name={st.view.name} />}
            {st.kind === "cancelled" && (
              <Box>
                <h1 className="text-lg font-bold mb-2">このご予約はキャンセルになっています</h1>
                <p className="text-sm text-gray-600 leading-relaxed">あらためてご予約される場合は、下記のLINE・お電話からご連絡ください。</p>
              </Box>
            )}
            {st.kind === "changed" && (
              <Box>
                <h1 className="text-lg font-bold mb-2">ご予約の日時が変更されています</h1>
                <p className="text-sm text-gray-600 leading-relaxed">
                  このメールのあとに日時が変わりました。いまのご予約は下のとおりです。新しいご案内メールのボタンから、あらためてご確認ください。
                </p>
              </Box>
            )}
            {st.kind === "past" && (
              <Box>
                <h1 className="text-lg font-bold mb-2">このご予約の日時は過ぎています</h1>
                <p className="text-sm text-gray-600 leading-relaxed">ご不明な点がございましたら、下記のLINE・お電話からご連絡ください。</p>
              </Box>
            )}
            <Detail view={st.view} />
          </>
        )}

        <Box>
          <p className="text-sm font-bold mb-1">お時間の変更・お問い合わせ</p>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            下記のLINEにてお願いいたします。お電話でも承ります。前日21時までのご連絡なら、変更・キャンセルは無料です。
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a href={STORE_LINE_URL} className="text-center rounded-md bg-[#06C755] text-white text-sm font-bold py-3">LINEで連絡</a>
            <a href={`tel:${FITSTAGE_TEL.replace(/-/g, "")}`} className="text-center rounded-md border border-gray-300 bg-white text-sm font-bold py-3">電話する</a>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">TEL {FITSTAGE_TEL}</p>
        </Box>
      </main>
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <section className="bg-white border border-gray-200 rounded-md px-4 py-4">{children}</section>;
}

function Done({ name }: { name: string }) {
  return (
    <Box>
      <p className="text-gold-600 text-xs font-bold tracking-widest mb-1">CONFIRMED</p>
      <h1 className="text-lg font-bold mb-2">ご予約を確認しました</h1>
      <p className="text-sm text-gray-600 leading-relaxed">{name} 様、ご確認ありがとうございます。当日お会いできることを楽しみにしております。</p>
    </Box>
  );
}

function Detail({ view }: { view: ConfirmView }) {
  const row = "flex gap-3 py-2 border-b border-gray-100 last:border-b-0 text-sm";
  const th = "w-16 flex-shrink-0 text-gray-500";
  return (
    <Box>
      <p className="text-sm font-bold mb-1">ご予約内容</p>
      <div>
        <div className={row}><span className={th}>お名前</span><span>{view.name} 様</span></div>
        <div className={row}><span className={th}>日時</span><span>{view.slot}</span></div>
        {view.storeName && <div className={row}><span className={th}>店舗</span><span>{view.storeName}</span></div>}
        {view.address && (
          <div className={row}>
            <span className={th}>住所</span>
            <span>{view.address}{view.access && <span className="block text-xs text-gray-500 mt-0.5">{view.access}</span>}</span>
          </div>
        )}
        <div className={row}><span className={th}>内容</span><span>体験パーソナルトレーニング（60分）</span></div>
      </div>
    </Box>
  );
}

