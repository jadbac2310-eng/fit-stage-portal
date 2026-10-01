import { getExpenses } from "@/lib/expenses";
import { getCurrentIsAdmin } from "@/lib/members";
import { ExpensesClient } from "./expenses-client";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const [expenses, isAdmin] = await Promise.all([getExpenses(), getCurrentIsAdmin()]);
  return <ExpensesClient expenses={expenses} isAdmin={isAdmin} />;
}
