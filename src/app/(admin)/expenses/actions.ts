"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { addExpense, deleteExpense } from "@/lib/db/expenses";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/expenseCategory";

export type ExpenseFormState = { ok?: true; error?: string };

export async function createExpense(
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const session = await requireAdmin();

  const amount = Number(String(formData.get("amount") ?? "").replace(/\D/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Впишите сумму расхода" };
  }

  const day = String(formData.get("spent_on") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: "Выберите дату расхода" };

  const raw = String(formData.get("category") ?? "");
  const category = (EXPENSE_CATEGORIES as readonly string[]).includes(raw)
    ? (raw as ExpenseCategory)
    : "other";

  try {
    await addExpense({
      spent_on: day,
      category,
      amount: Math.trunc(amount),
      note: String(formData.get("note") ?? ""),
      created_by: session.masterId,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось записать расход" };
  }

  revalidatePath("/expenses");
  revalidatePath("/analytics");
  return { ok: true };
}

export async function removeExpense(id: string) {
  await requireAdmin();
  try {
    await deleteExpense(id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось удалить" };
  }
  revalidatePath("/expenses");
  revalidatePath("/analytics");
  return { ok: true as const };
}
