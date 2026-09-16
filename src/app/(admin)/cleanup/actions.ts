"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { previewCleanup, runCleanup, type CleanupPreview } from "@/lib/db/cleanup";

export type CleanupState = {
  preview?: CleanupPreview & { from: string; to: string };
  removed?: { orders: number; leads: number; invoices: number; expenses: number };
  error?: string;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Слово подтверждения. Нажать случайно нельзя — его надо набрать руками. */
const CONFIRM_WORD = "УДАЛИТЬ";

function period(formData: FormData): { from: string; to: string } | null {
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  if (!DAY.test(from) || !DAY.test(to) || from > to) return null;
  return { from, to };
}

/** Первый шаг: показать, что именно уйдёт. Ничего не удаляет. */
export async function previewAction(
  _prev: CleanupState,
  formData: FormData,
): Promise<CleanupState> {
  await requireAdmin();

  const range = period(formData);
  if (!range) return { error: "Выберите период: начало не позже конца" };

  try {
    const preview = await previewCleanup(range.from, range.to);
    return { preview: { ...preview, ...range } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось посчитать" };
  }
}

/** Второй шаг: удаление. Требует слова подтверждения. */
export async function cleanupAction(
  _prev: CleanupState,
  formData: FormData,
): Promise<CleanupState> {
  await requireAdmin();

  const range = period(formData);
  if (!range) return { error: "Выберите период: начало не позже конца" };

  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== CONFIRM_WORD) {
    return { error: `Впишите слово ${CONFIRM_WORD}, чтобы подтвердить удаление` };
  }

  const scope = {
    orders: formData.get("orders") === "on",
    leads: formData.get("leads") === "on",
    expenses: formData.get("expenses") === "on",
  };

  if (!scope.orders && !scope.leads && !scope.expenses) {
    return { error: "Отметьте, что удалять" };
  }

  try {
    const removed = await runCleanup(range.from, range.to, scope);
    revalidatePath("/orders");
    revalidatePath("/leads");
    revalidatePath("/invoices");
    revalidatePath("/expenses");
    revalidatePath("/analytics");
    return { removed };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось удалить" };
  }
}
