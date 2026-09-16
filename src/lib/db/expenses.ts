import "server-only";
import { db } from "@/lib/supabase";
import type { ExpenseCategory } from "@/lib/expenseCategory";

/**
 * Расходы компании за период.
 *
 * Дата расхода — отдельное поле: рекламу за вторник вписывают в среду,
 * и в аналитике она должна лечь во вторник, иначе день не сойдётся.
 */
export type Expense = {
  id: string;
  spent_on: string;
  category: ExpenseCategory;
  amount: number;
  note: string | null;
};

const COLUMNS = "id, spent_on, category, amount, note";

export async function listExpenses(from: string, to: string): Promise<Expense[]> {
  const { data, error } = await db()
    .from("company_expenses")
    .select(COLUMNS)
    .gte("spent_on", from)
    .lte("spent_on", to)
    .order("spent_on", { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data ?? []) as Expense[];
}

export async function addExpense(input: {
  spent_on: string;
  category: ExpenseCategory;
  amount: number;
  note?: string | null;
  created_by?: string;
}): Promise<void> {
  const { error } = await db().from("company_expenses").insert({
    spent_on: input.spent_on,
    category: input.category,
    amount: input.amount,
    note: input.note?.trim() || null,
    created_by: input.created_by ?? null,
  });
  if (error) throw error;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await db().from("company_expenses").delete().eq("id", id);
  if (error) throw error;
}

/** Суммы по видам расхода и по дням — для аналитики. */
export function summarize(expenses: Expense[]) {
  const byCategory = new Map<ExpenseCategory, number>();
  const byDay = new Map<string, number>();
  let total = 0;

  for (const row of expenses) {
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + row.amount);
    byDay.set(row.spent_on, (byDay.get(row.spent_on) ?? 0) + row.amount);
    total += row.amount;
  }

  return { total, byCategory, byDay };
}
