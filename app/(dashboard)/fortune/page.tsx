import { MoonStar, Users, Sparkles, Info } from "lucide-react";
import Link from "next/link";
import { getCurrentMember, getMembers } from "@/lib/members";
import { getCustomers } from "@/lib/customers";
import { getLessons } from "@/lib/lessons";
import { cn } from "@/lib/cn";
import {
  starTypeOf, monthPhase, yearCycle, monthCycle, relationPhase, nextBigDecline,
  PHASE_KIND, type Phase, type StarType,
} from "@/lib/rokusei";
import { PHASE_TEXT, starText, phaseBadge } from "@/lib/rokusei-content";
import { starToday, jstYmd } from "@/lib/fortune-of-day";
import { BirthForm } from "./birth-form";

export const dynamic = "force-dynamic";

/**
 * 星まわり。六星占術の考え方をもとに、自分の星・今日／今月／今年の運気・今日のひとつを出す。
 *
 * 軽さ優先：計算は全部この場で（lib/rokusei.ts）、外部APIもAIも使わない。
 * 文章は lib/rokusei-content.ts。前向きに・行動に結びつけて書く決まりはそちらに。
 */
export default async function FortunePage() {
  const me = await getCurrentMember();
  if (!me) return null;
  const now = new Date().getTime();
  const { y, m } = jstYmd(now);

  if (!me.birthDate) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Header />
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-bold text-gray-900">生年月日を入れると、あなたの星と今日の運気が出ます</p>
          <p className="text-xs text-gray-500 mt-1 mb-4">自分だけが入れられます。ダッシュボードの「運勢」もあなた専用に変わります。</p>
          <BirthForm />
        </div>
        <About />
      </div>
    );
  }

  const st = starToday(me.birthDate, me.id, now)!;
  const t = st.type;
  const text = starText(t.star, t.polarity);
  const monthText = PHASE_TEXT[st.month];
  const yearText = PHASE_TEXT[st.year];
  const decline = nextBigDecline(t, y);
  const inDecline = y >= decline.from && y <= decline.to;

  // チーム：生年月日が入っている人（自分以外）
  const [members, customers] = await Promise.all([getMembers(), getCustomers()]);
  const team = members
    .filter((x) => x.id !== me.id && x.birthDate)
    .map((x) => ({ m: x, type: starTypeOf(x.birthDate!) }))
    .filter((x): x is { m: typeof x.m; type: StarType } => !!x.type);

  // お客様：自分のお客様（担当営業が自分か、直近半年に自分がレッスンした人）。管理者は在籍中の全員
  const since = new Date(now - 183 * 86400000).toISOString().slice(0, 10);
  const lessons = await getLessons(since);
  const mine = new Set(lessons.filter((l) => l.trainerMemberId === me.id).map((l) => l.customerId));
  const myCustomers = customers
    .filter((c) => c.status === "active" && c.dateOfBirth && (me.isAdmin || c.salesMemberId === me.id || mine.has(c.id)))
    .map((c) => ({ c, type: starTypeOf(c.dateOfBirth!) }))
    .filter((x): x is { c: typeof x.c; type: StarType } => !!x.type)
    .sort((a, b) => a.c.fullName.localeCompare(b.c.fullName, "ja"))
    .slice(0, 60);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Header />

      {/* 自分の星 */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 mb-4 shadow-md">
        <p className="text-[11px] tracking-widest text-indigo-200">{me.name}さんの星</p>
        <p className="text-2xl font-bold mt-1">
          {t.label}
          {t.reigo && <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 align-middle">霊合星人</span>}
        </p>
        <p className="text-sm text-indigo-100 mt-0.5">{text.catch}</p>
        <p className="text-sm text-white/90 mt-3 leading-relaxed">{text.traits}</p>
        <p className="text-sm text-white/90 mt-1.5 leading-relaxed"><span className="text-indigo-200">FIT STAGEでは：</span>{text.work}</p>
        <p className="text-xs text-indigo-200 mt-2 leading-relaxed">{text.note}</p>
      </section>

      {/* 今日 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-widest text-gray-400">今日 {m}/{jstYmd(now).d}</p>
          {st.badge && <Badge phase={st.today} />}
        </div>
        <p className="text-xl font-bold text-gray-900 mt-1">
          <span className="mr-1.5">{st.emoji}</span>{st.today}<span className="text-sm font-semibold text-gray-500 ml-2">{st.name}</span>
        </p>
        <p className="text-sm text-gray-700 mt-1">{st.summary}</p>
        <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
          <p className="text-[11px] font-bold text-amber-700">今日のひとつ</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">{st.tip}</p>
        </div>
      </section>

      {/* 今月・今年 */}
      <section className="grid gap-3 md:grid-cols-2 mb-4">
        <PhaseCard title={`今月（${m}月）`} phase={st.month} text={monthText} lines={[["仕事", monthText.work], ["お客様", monthText.customer], ["自分", monthText.self]]} />
        <PhaseCard title={`今年（${y}年）`} phase={st.year} text={yearText} lines={[["ざっくり", yearText.summary]]}
          footer={inDecline
            ? `${decline.from}〜${decline.to}年は充電期。足元を固めるほど ${decline.to + 1}年からの春が大きくなります`
            : `次の充電期は ${decline.from}〜${decline.to}年。それまでに積み上げる`} />
      </section>

      {/* 1年の流れ */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 mb-4">
        <p className="text-xs font-bold text-gray-700 mb-2">1年の流れ（毎年同じ）</p>
        <div className="grid grid-cols-6 gap-1.5">
          {monthCycle(t).map(({ month, phase }) => (
            <Chip key={month} label={`${month}月`} phase={phase} active={month === m} />
          ))}
        </div>
        <p className="text-xs font-bold text-gray-700 mt-4 mb-2">12年の流れ</p>
        <div className="grid grid-cols-6 gap-1.5">
          {yearCycle(t, y - 1).map(({ year, phase }) => (
            <Chip key={year} label={`${year}`} phase={phase} active={year === y} />
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">🌱🌿🌸 春（伸びる）・🍵🏆🌪️ 夏（勝負と揺れ）・🤝💰⚓ 秋（実り）・🌙❄️🍂 冬（充電）</p>
      </section>

      {/* チーム */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Users size={14} className="text-blue-600" />
          <p className="text-xs font-bold text-gray-700">チームの星</p>
        </div>
        {team.length === 0 ? (
          <p className="text-xs text-gray-400">まだ誰も生年月日を入れていません。入れた人からここに並びます。</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {team.map(({ m: x, type }) => {
              const mp = monthPhase(type, m);
              const toMe = relationPhase(t, type);     // 自分から見た相手
              const fromMe = relationPhase(type, t);   // 相手から見た自分
              return (
                <li key={x.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {x.name}
                      <span className="ml-2 text-xs font-medium text-gray-500">{type.label}・{starText(type.star, type.polarity).catch}</span>
                    </p>
                    <span className="text-xs text-gray-600 whitespace-nowrap">{PHASE_TEXT[mp].emoji} 今月 {mp}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    あなたにとって「{toMe}」＝{PHASE_TEXT[toMe].relation}。相手にとってあなたは「{fromMe}」。
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* お客様 */}
      <details className="rounded-2xl border border-gray-200 bg-white p-4 mb-4 group">
        <summary className="cursor-pointer list-none flex items-center gap-1.5">
          <Sparkles size={14} className="text-pink-500" />
          <p className="text-xs font-bold text-gray-700">お客様との話のネタ <span className="font-normal text-gray-400">（{myCustomers.length}人・タップで開く）</span></p>
        </summary>
        <p className="text-[11px] text-gray-400 mt-2">生年月日が入っているお客様だけ。押しつけず、話題のひとつとして。「今月は○○どきらしいですよ」くらいが、ちょうどいい。</p>
        {myCustomers.length === 0 ? (
          <p className="text-xs text-gray-400 mt-2">生年月日の入っているお客様がいません（顧客マスタで入れられます）。</p>
        ) : (
          <ul className="divide-y divide-gray-100 mt-2">
            {myCustomers.map(({ c, type }) => {
              const mp = monthPhase(type, m);
              return (
                <li key={c.id} className="py-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {c.fullName}
                    <span className="ml-2 text-xs font-medium text-gray-500">{type.label}</span>
                    <span className="ml-2 text-xs text-gray-600">{PHASE_TEXT[mp].emoji} 今月 {mp}（{PHASE_TEXT[mp].name}）</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{PHASE_TEXT[mp].customer}</p>
                </li>
              );
            })}
          </ul>
        )}
      </details>

      <details className="rounded-2xl border border-gray-200 bg-white p-4 mb-4">
        <summary className="cursor-pointer list-none text-xs font-bold text-gray-700">生年月日を変える</summary>
        <div className="mt-3"><BirthForm current={me.birthDate} compact /></div>
      </details>

      <About />
    </div>
  );
}

function Header() {
  return (
    <div className="mb-4">
      <div className="hidden md:flex items-center gap-2">
        <MoonStar size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-gray-900">星まわり</h1>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">今日の運気と、今日のひとつ。読んだら、ひとつだけ動く。</p>
    </div>
  );
}

function Badge({ phase }: { phase: Phase }) {
  const b = phaseBadge(phase);
  if (!b) return null;
  const kind = PHASE_KIND[phase];
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
      kind === "big" ? "bg-indigo-100 text-indigo-700" : kind === "middle" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
      {b}
    </span>
  );
}

function Chip({ label, phase, active }: { label: string; phase: Phase; active: boolean }) {
  const kind = PHASE_KIND[phase];
  return (
    <div className={cn("rounded-lg px-1 py-1.5 text-center border",
      active ? "border-gray-900 bg-gray-900 text-white" :
      kind === "big" ? "border-indigo-100 bg-indigo-50 text-indigo-800" :
      kind === "middle" ? "border-amber-100 bg-amber-50 text-amber-800" :
      kind === "small" ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-gray-100 bg-white text-gray-700")}>
      <p className="text-[10px] leading-none opacity-80">{label}</p>
      <p className="text-[11px] font-semibold leading-tight mt-1">{PHASE_TEXT[phase].emoji}{phase}</p>
    </div>
  );
}

function PhaseCard({ title, phase, text, lines, footer }: {
  title: string; phase: Phase; text: { emoji: string; name: string }; lines: [string, string][]; footer?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400">{title}</p>
        <Badge phase={phase} />
      </div>
      <p className="text-lg font-bold text-gray-900 mt-1">
        <span className="mr-1.5">{text.emoji}</span>{phase}<span className="text-sm font-semibold text-gray-500 ml-2">{text.name}</span>
      </p>
      <dl className="mt-2 space-y-1">
        {lines.map(([k, v]) => (
          <div key={k} className="flex gap-2 text-xs">
            <dt className="w-12 flex-shrink-0 font-semibold text-gray-500">{k}</dt>
            <dd className="text-gray-700 leading-relaxed">{v}</dd>
          </div>
        ))}
      </dl>
      {footer && <p className="text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-100">{footer}</p>}
    </div>
  );
}

function About() {
  return (
    <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-xs text-gray-500 leading-relaxed">
      <p className="flex items-center gap-1.5 font-bold text-gray-600 mb-1"><Info size={12} /> この占いについて</p>
      <p>六星占術の考え方をもとに、生まれた日の干支から6つの星（土星・金星・火星・天王星・木星・水星）と＋−を出し、12の運気を年・月・日で読んでいます。</p>
      <p className="mt-1">当たる・当たらないより、「今日はこれをやる」を決める道具として。充電期（大殺界）は休んで備える時期で、悪い時期ではありません。</p>
      <p className="mt-1">迷ったら <Link href="/assistant" className="underline">アシスタント</Link> に「今月の自分のレッスン数は？」と聞いて、数字と合わせて見てください。</p>
    </div>
  );
}
