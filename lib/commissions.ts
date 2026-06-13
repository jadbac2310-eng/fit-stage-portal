import type { Customer, CustomerType } from "./customers-types";
import type { Lesson } from "./lessons-types";
import type { TrialLesson } from "./trial-lessons-types";
import { getLessonFee, TRAINER_RATE, SALES_RATE, CONTRACT_BONUS } from "./commissions-types";

// ─── 表示行・集計の型 ────────────────────────────────────
export interface TrainerLessonRow {
  lessonId:     string;
  customerName: string;
  course:       string;
  scheduledAt:  string;
  fee:          number;
  commission:   number;
}

export interface TrainerEntry {
  memberId:   string;
  memberName: string;
  lessons:    TrainerLessonRow[];
  total:      number;
}

export interface SalesLessonRow {
  lessonId:     string;
  customerName: string;
  customerType: CustomerType;
  course:       string;
  scheduledAt:  string;
  fee:          number;
  commission:   number;
}

export interface BonusRow {
  trialId:      string;
  customerName: string;
  customerType: CustomerType;
  scheduledAt:  string;
  amount:       number;
}

export interface SalesEntry {
  memberId:    string;
  memberName:  string;
  lessons:     SalesLessonRow[];
  bonuses:     BonusRow[];
  lessonTotal: number;
  bonusTotal:  number;
  total:       number;
}

export function isoToMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 選択月のトレーナー歩合集計（lessons は完了レッスンを渡す） */
export function buildTrainerEntries(lessons: Lesson[], month: string): TrainerEntry[] {
  const filtered = lessons.filter((l) => isoToMonth(l.scheduledAt) === month && l.trainerMemberId);
  const map = new Map<string, TrainerEntry>();

  for (const l of filtered) {
    const tid  = l.trainerMemberId!;
    const fee  = getLessonFee(l.course);
    const comm = Math.round(fee * TRAINER_RATE);

    if (!map.has(tid)) {
      map.set(tid, { memberId: tid, memberName: l.trainerMemberName ?? tid, lessons: [], total: 0 });
    }
    const entry = map.get(tid)!;
    entry.lessons.push({
      lessonId: l.id, customerName: l.customerName,
      course: l.course ?? "", scheduledAt: l.scheduledAt,
      fee, commission: comm,
    });
    entry.total += comm;
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

/**
 * 選択月の営業歩合集計。
 * - lessons: 完了レッスン
 * - trialLessons: 成約済み体験レッスン（営業担当・成約ボーナスの算出元）
 */
export function buildSalesEntries(
  lessons: Lesson[],
  trialLessons: TrialLesson[],
  customers: Customer[],
  month: string,
): SalesEntry[] {
  const customerTypeMap: Record<string, CustomerType> = {};
  for (const c of customers) customerTypeMap[c.id] = c.customerType;

  // 顧客ID → 営業担当（最初に成約した体験レッスンから）
  const salesByCustomer: Record<string, { memberId: string; memberName: string }> = {};
  for (const tl of trialLessons) {
    if (!salesByCustomer[tl.customerId]) {
      salesByCustomer[tl.customerId] = { memberId: tl.salesMemberId, memberName: tl.salesMemberName };
    }
  }

  const map = new Map<string, SalesEntry>();
  const ensureEntry = (memberId: string, memberName: string) => {
    if (!map.has(memberId)) {
      map.set(memberId, {
        memberId, memberName,
        lessons: [], bonuses: [],
        lessonTotal: 0, bonusTotal: 0, total: 0,
      });
    }
    return map.get(memberId)!;
  };

  // レッスン歩合
  for (const l of lessons.filter((l) => isoToMonth(l.scheduledAt) === month)) {
    const sales = salesByCustomer[l.customerId];
    if (!sales) continue;

    const cType = customerTypeMap[l.customerId] ?? "individual";
    const fee   = getLessonFee(l.course);
    const comm  = Math.round(fee * SALES_RATE[cType]);

    const entry = ensureEntry(sales.memberId, sales.memberName);
    entry.lessons.push({
      lessonId: l.id, customerName: l.customerName, customerType: cType,
      course: l.course ?? "", scheduledAt: l.scheduledAt, fee, commission: comm,
    });
    entry.lessonTotal += comm;
    entry.total       += comm;
  }

  // 成約ボーナス（成約日が選択月のもの）
  for (const tl of trialLessons.filter((tl) => isoToMonth(tl.scheduledAt) === month)) {
    const cType = customerTypeMap[tl.customerId] ?? "individual";
    const bonus = CONTRACT_BONUS[cType];

    const entry = ensureEntry(tl.salesMemberId, tl.salesMemberName);
    entry.bonuses.push({
      trialId: tl.id, customerName: tl.customerName, customerType: cType,
      scheduledAt: tl.scheduledAt, amount: bonus,
    });
    entry.bonusTotal += bonus;
    entry.total      += bonus;
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
