import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { getCurrentIsAdmin } from "@/lib/members";
import { getCustomers } from "@/lib/customers";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getMembers } from "@/lib/members";
import { getAllPlans, getAllSessionPassPrices, buildLessonFeeMap, buildSessionPassPriceMap } from "@/lib/plans-master";
import { getActivityLogs } from "@/lib/activity-logs";
import {
  resolveLessonFee, buildTrainerEntries, buildSalesEntries, isoToMonth, type CommissionContext,
} from "@/lib/commissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// 安価なモデルを使用（ユーザー要望）。ツール使用で社内データを読みながら回答する。
const MODEL = "claude-haiku-4-5";

function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const SYSTEM = `あなたはFIT STAGE（パーソナルジム）の管理者向けデータアシスタントです。
管理者の質問に対し、ツールで社内データ（顧客・レッスン・売上・歩合・操作ログなど）を読み取って、日本語で簡潔かつ正確に答えます。

## ルール
- 数字や事実はツールで取得したデータのみに基づいて答え、推測で値を作らないこと。
- 月の指定がない場合は今月（${thisMonth()}）を対象にする。「先月」などは適切な YYYY-MM に変換する。
- 金額は「¥1,234,567」の形式で表示する。
- これは閲覧専用アシスタントです。データの作成・編集・削除はできません。依頼された場合はその旨を伝え、該当画面を案内する。
- 必要なデータだけを取得し、回答は要点を先に述べる。表が役立つ場合は簡潔な表で示す。
- 個人情報（顧客のメール・電話・生年月日など）は質問に必要な範囲でのみ扱う。

今日の日付: ${new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_business_summary",
    description: "対象月の経営サマリー（売上・トレーナー支払・営業支払・レンタルジム代・利益・新規顧客・成約・在籍数）を取得します。",
    input_schema: {
      type: "object",
      properties: { month: { type: "string", description: "対象月 YYYY-MM（省略時は今月）" } },
    },
  },
  {
    name: "list_customers",
    description: "顧客の一覧を取得します。名前で絞り込み（query）やステータス（active/inactive/pending/trial）で絞れます。",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "氏名の部分一致" },
        status: { type: "string", description: "active / inactive / pending / trial" },
        limit: { type: "number", description: "最大件数（既定50）" },
      },
    },
  },
  {
    name: "get_customer",
    description: "1顧客の詳細（基本情報・加入中プラン・回数券残・直近レッスン）を取得します。氏名またはIDを指定。",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "顧客の氏名（部分一致）" },
        id: { type: "string", description: "顧客ID" },
      },
    },
  },
  {
    name: "list_lessons",
    description: "レッスン一覧を取得します。月・顧客名・トレーナー名・ステータス（scheduled/completed/cancelled）で絞れます。",
    input_schema: {
      type: "object",
      properties: {
        month: { type: "string", description: "対象月 YYYY-MM" },
        customer: { type: "string", description: "顧客名の部分一致" },
        trainer: { type: "string", description: "トレーナー名の部分一致" },
        status: { type: "string", description: "scheduled / completed / cancelled" },
        limit: { type: "number", description: "最大件数（既定40）" },
      },
    },
  },
  {
    name: "get_commissions",
    description: "対象月のトレーナー・営業の歩合（メンバー別合計）を取得します。",
    input_schema: {
      type: "object",
      properties: { month: { type: "string", description: "対象月 YYYY-MM（省略時は今月）" } },
    },
  },
  {
    name: "list_members",
    description: "担当者（スタッフ）の一覧を取得します。",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_activity_logs",
    description: "操作・ログイン履歴を取得します。担当者名で絞れます。",
    input_schema: {
      type: "object",
      properties: {
        member: { type: "string", description: "担当者名の部分一致" },
        limit: { type: "number", description: "最大件数（既定30）" },
      },
    },
  },
];

const yen = (n: number) => `¥${Math.round(n).toLocaleString("ja-JP")}`;

async function buildCtx(): Promise<{
  ctx: CommissionContext;
  customers: Awaited<ReturnType<typeof getCustomers>>;
  lessons: Awaited<ReturnType<typeof getLessons>>;
  trialLessons: Awaited<ReturnType<typeof getTrialLessons>>;
}> {
  const [customers, lessons, trialLessons, passes, plans, members, plansMaster, sppPrices] = await Promise.all([
    getCustomers(), getLessons(), getTrialLessons(), getAllSessionPasses(),
    getAllCustomerPlans(), getMembers(), getAllPlans(), getAllSessionPassPrices(),
  ]);
  const ctx: CommissionContext = {
    customers, sessionPasses: passes, customerPlans: plans,
    members: members.map((m) => ({ id: m.id, name: m.name })),
    lessonFees: buildLessonFeeMap(plansMaster),
    sessionPassPriceMap: buildSessionPassPriceMap(sppPrices),
  };
  return { ctx, customers, lessons, trialLessons };
}

type ToolInput = Record<string, string | number | undefined>;

async function runTool(name: string, input: ToolInput): Promise<string> {
  try {
    switch (name) {
      case "get_business_summary": {
        const month = (input.month as string) || thisMonth();
        const { ctx, customers, lessons, trialLessons } = await buildCtx();
        const completed = lessons.filter((l) => l.status === "completed");
        const inMonth = completed.filter((l) => isoToMonth(l.scheduledAt) === month);
        const revenue = inMonth.reduce((s, l) => s + resolveLessonFee(l, ctx), 0);
        const rentalCost = inMonth.reduce((s, l) => s + (l.rentalGymFee ?? 0), 0);
        const trainerPayout = buildTrainerEntries(completed, month, ctx).reduce((s, e) => s + e.total, 0);
        const contractedTrials = trialLessons.filter((t) => t.contracted === true);
        const salesPayout = buildSalesEntries(completed, contractedTrials, month, ctx).reduce((s, e) => s + e.total, 0);
        const profit = revenue - trainerPayout - salesPayout - rentalCost;
        return JSON.stringify({
          month,
          revenue: yen(revenue),
          trainerPayout: yen(trainerPayout),
          salesPayout: yen(salesPayout),
          rentalCost: yen(rentalCost),
          profit: yen(profit),
          profitMargin: revenue > 0 ? `${Math.round((profit / revenue) * 100)}%` : "—",
          completedLessons: inMonth.length,
          newCustomers: customers.filter((c) => isoToMonth(c.createdAt) === month).length,
          activeCustomers: customers.filter((c) => c.status === "active").length,
          contracted: trialLessons.filter((t) => t.contracted === true && isoToMonth(t.scheduledAt) === month).length,
        });
      }
      case "list_customers": {
        const [customers, members] = await Promise.all([getCustomers(), getMembers()]);
        const nameOf = (id?: string) => (id ? members.find((m) => m.id === id)?.name : undefined);
        const q = (input.query as string)?.trim();
        const status = (input.status as string)?.trim();
        const limit = Number(input.limit) || 50;
        const rows = customers
          .filter((c) => (!q || c.fullName.includes(q)) && (!status || c.status === status))
          .slice(0, limit)
          .map((c) => ({ id: c.id, name: c.fullName, status: c.status, type: c.customerType, sales: nameOf(c.salesMemberId) }));
        return JSON.stringify({ count: rows.length, customers: rows });
      }
      case "get_customer": {
        const [customers, lessons, passes, plans, members] = await Promise.all([
          getCustomers(), getLessons(), getAllSessionPasses(), getAllCustomerPlans(), getMembers(),
        ]);
        const id = (input.id as string)?.trim();
        const nm = (input.name as string)?.trim();
        const c = customers.find((x) => (id && x.id === id) || (nm && x.fullName.includes(nm)));
        if (!c) return JSON.stringify({ error: "顧客が見つかりません" });
        const today = new Date().toISOString().slice(0, 10);
        const activePlan = plans.find((p) => p.customerId === c.id && p.startedAt <= today && (!p.endedAt || p.endedAt >= today));
        const remaining = passes.filter((p) => p.customerId === c.id).reduce((s, p) => s + p.remainingCount, 0);
        const myLessons = lessons.filter((l) => l.customerId === c.id);
        const recent = myLessons
          .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
          .slice(0, 5)
          .map((l) => ({ date: l.scheduledAt.slice(0, 10), course: l.course, status: l.status, trainer: l.trainerMemberName, location: l.location }));
        return JSON.stringify({
          id: c.id, name: c.fullName, status: c.status, type: c.customerType,
          sales: members.find((m) => m.id === c.salesMemberId)?.name,
          activePlan: activePlan ? { plan: activePlan.plan, price: activePlan.price } : null,
          sessionPassRemaining: remaining,
          totalLessons: myLessons.length,
          recentLessons: recent,
        });
      }
      case "list_lessons": {
        const lessons = await getLessons();
        const month = (input.month as string)?.trim();
        const cust = (input.customer as string)?.trim();
        const trainer = (input.trainer as string)?.trim();
        const status = (input.status as string)?.trim();
        const limit = Number(input.limit) || 40;
        const rows = lessons
          .filter((l) =>
            (!month || isoToMonth(l.scheduledAt) === month) &&
            (!cust || l.customerName.includes(cust)) &&
            (!trainer || (l.trainerMemberName ?? "").includes(trainer)) &&
            (!status || l.status === status))
          .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
          .slice(0, limit)
          .map((l) => ({
            date: l.scheduledAt.slice(0, 16).replace("T", " "),
            customer: l.customerName, course: l.course, status: l.status,
            trainer: l.trainerMemberName, location: l.location,
            rentalGymFee: l.rentalGymFee ?? undefined,
          }));
        return JSON.stringify({ count: rows.length, lessons: rows });
      }
      case "get_commissions": {
        const month = (input.month as string) || thisMonth();
        const { ctx, lessons, trialLessons } = await buildCtx();
        const completed = lessons.filter((l) => l.status === "completed");
        const contractedTrials = trialLessons.filter((t) => t.contracted === true);
        const trainer = buildTrainerEntries(completed, month, ctx).map((e) => ({ name: e.memberName, total: yen(e.total), lessons: e.lessons.length }));
        const sales = buildSalesEntries(completed, contractedTrials, month, ctx).map((e) => ({ name: e.memberName, total: yen(e.total), lessonPart: yen(e.lessonTotal), bonusPart: yen(e.bonusTotal) }));
        return JSON.stringify({ month, trainer, sales });
      }
      case "list_members": {
        const members = await getMembers();
        return JSON.stringify(members.map((m) => ({ id: m.id, name: m.name, role: m.role, isAdmin: m.isAdmin })));
      }
      case "get_activity_logs": {
        const member = (input.member as string)?.trim();
        const limit = Number(input.limit) || 30;
        const logs = await getActivityLogs({ limit: 300 });
        const rows = logs
          .filter((l) => !member || (l.memberName ?? "").includes(member))
          .slice(0, limit)
          .map((l) => ({ at: l.createdAt.slice(0, 16).replace("T", " "), member: l.memberName, action: l.action, summary: l.summary }));
        return JSON.stringify({ count: rows.length, logs: rows });
      }
      default:
        return JSON.stringify({ error: "Unknown tool" });
    }
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

export async function POST(request: NextRequest) {
  if (!(await getCurrentIsAdmin())) {
    return new Response(JSON.stringify({ error: "権限がありません（管理者のみ）" }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });
  }

  const { messages } = await request.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        let currentMessages: Anthropic.MessageParam[] = (messages as { role: string; content: string }[])
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

        for (let guard = 0; guard < 8; guard++) {
          const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: SYSTEM,
            messages: currentMessages,
            tools: TOOLS,
          });

          for (const block of response.content) {
            if (block.type === "text" && block.text) send({ type: "text", text: block.text });
          }

          if (response.stop_reason !== "tool_use") break;

          const toolUseBlocks = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
          );
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of toolUseBlocks) {
            send({ type: "tool", name: block.name, input: block.input });
            const result = await runTool(block.name, block.input as ToolInput);
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
          }

          currentMessages = [
            ...currentMessages,
            { role: "assistant", content: response.content },
            { role: "user", content: toolResults },
          ];
        }

        send({ type: "done" });
      } catch (e) {
        send({ type: "error", message: String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
