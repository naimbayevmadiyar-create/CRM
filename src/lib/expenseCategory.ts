/**
 * Виды расходов компании.
 *
 * Список закрытый и короткий: чем меньше выбор, тем честнее статистика.
 * Всё, что не вписалось, — «прочее» с пояснением своими словами.
 */
import type { ExpenseCategory } from "@/types/db";

export const EXPENSE_CATEGORIES = ["marketing", "rent", "salary", "other"] as const;

export type { ExpenseCategory };

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  marketing: "Реклама",
  rent: "Аренда",
  salary: "Зарплаты",
  other: "Прочее",
};
