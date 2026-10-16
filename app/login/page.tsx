import Image from "next/image";
import { quoteOfTheDay } from "@/lib/daily-quote";
import { LoginForm } from "./login-form";

// 格言は日付で変わるので、毎回サーバーで組み立てる
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const quote = quoteOfTheDay();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image
            src="/title.png"
            alt="FIT STAGE"
            width={180}
            height={62}
            className="mx-auto mb-4"
            priority
          />
          <p className="text-lg font-semibold text-gray-700">ポータル</p>
        </div>

        <LoginForm />

        {/* 本日の格言 */}
        <div className="mt-6 text-center px-2">
          <p className="text-sm font-semibold text-gray-600 leading-relaxed">{quote.text}</p>
          <p className="text-xs text-gray-400 mt-1.5">― {quote.by}</p>
        </div>
      </div>
    </div>
  );
}
