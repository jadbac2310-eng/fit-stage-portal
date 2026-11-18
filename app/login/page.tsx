import Image from "next/image";
import { randomQuote } from "@/lib/daily-quote";
import { LoginForm } from "./login-form";
import { IdleSurprise } from "./idle-surprise";
import { LangProvider } from "@/components/i18n/lang-provider";
import { LangSwitch } from "@/components/layout/lang-switch";
import { getLang } from "@/lib/i18n-server";

// 格言は日付で変わるので、毎回サーバーで組み立てる
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // 格言は開くたびに変える（格言は日本語のまま）
  const quote = randomQuote();
  const lang = await getLang();

  return (
    <LangProvider lang={lang}>
    <div className="fs-login-root min-h-screen bg-gray-50 flex items-center justify-center p-4 overflow-hidden">
      {/* 5秒ぼーっとしていると一度だけ💥が出る（入力中は出ない） */}
      <IdleSurprise />
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-2"><LangSwitch /></div>
        <div className="fs-logo text-center mb-8">
          <Image
            src="/title.png"
            alt="FIT STAGE"
            width={180}
            height={62}
            className="mx-auto mb-4"
            priority
          />
          <p className="fs-sub text-lg font-semibold text-gray-700">{lang === "en" ? "Portal" : "ポータル"}</p>
        </div>

        <LoginForm />

        {/* 本日の格言 */}
        <div className="fs-login-quote mt-6 text-center px-2">
          <p className="text-sm font-semibold text-gray-600 leading-relaxed">{quote.text}</p>
          <p className="text-xs text-gray-400 mt-1.5">― {quote.by}</p>
        </div>
      </div>
    </div>
    </LangProvider>
  );
}
