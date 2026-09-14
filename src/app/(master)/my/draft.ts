import type { DraftItem } from "./ItemsEditor";

/**
 * Черновик отчёта на самом телефоне.
 *
 * Страница может перезагрузиться сама: после выкладки новой версии, при
 * потере сети, если телефон выгрузил вкладку из памяти. Набранные, но не
 * сохранённые суммы при этом пропадать не должны — мастер их второй раз
 * не вспомнит. Черновик живёт до «Сохранить» или закрытия заявки.
 *
 * Здесь только цифры и названия работ, никаких данных клиента.
 */

export type Draft = {
  total: number;
  expenses: number;
  expensesNote: string;
  items: DraftItem[];
};

const key = (orderId: string) => `cs_draft_${orderId}`;

export function readDraft(orderId: string): Draft | null {
  try {
    const raw = localStorage.getItem(key(orderId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Draft>;
    if (typeof value.total !== "number" || !Array.isArray(value.items)) return null;
    return {
      total: value.total,
      expenses: typeof value.expenses === "number" ? value.expenses : 0,
      expensesNote: typeof value.expensesNote === "string" ? value.expensesNote : "",
      items: value.items,
    };
  } catch {
    return null;
  }
}

export function writeDraft(orderId: string, draft: Draft): void {
  try {
    localStorage.setItem(key(orderId), JSON.stringify(draft));
  } catch {
    // приватный режим или переполнено — просто не сохраняем черновик
  }
}

export function clearDraft(orderId: string): void {
  try {
    localStorage.removeItem(key(orderId));
  } catch {
    // нечего чистить
  }
}
