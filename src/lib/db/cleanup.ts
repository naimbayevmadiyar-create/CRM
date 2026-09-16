import "server-only";
import { db } from "@/lib/supabase";

/**
 * Очистка данных за период.
 *
 * Пробные заявки первых дней мешаются в отчётах, и убирать их через SQL
 * каждый раз — не дело. Но удаление необратимо, поэтому здесь два шага:
 * сначала показываем, что именно уйдёт, и только потом удаляем.
 *
 * Мастера, пароли и реквизиты компании не трогаются никогда.
 */

export type CleanupScope = {
  orders: boolean;
  leads: boolean;
  expenses: boolean;
};

export type CleanupPreview = {
  orders: number;
  /** Из них закрытых, по которым деньги уже приняты. */
  confirmed: number;
  turnover: number;
  leads: number;
  invoices: number;
  expenses: number;
  expensesAmount: number;
};

/** Границы суток в Астане: день указывается целиком, оба конца включительно. */
function bounds(from: string, to: string) {
  return {
    fromIso: new Date(`${from}T00:00:00+05:00`).toISOString(),
    toIso: new Date(
      new Date(`${to}T00:00:00+05:00`).getTime() + 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}

async function orderIdsIn(from: string, to: string): Promise<string[]> {
  const { fromIso, toIso } = bounds(from, to);
  const { data, error } = await db()
    .from("orders")
    .select("id")
    .gte("created_at", fromIso)
    .lt("created_at", toIso)
    .limit(5000);

  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}

export async function previewCleanup(
  from: string,
  to: string,
): Promise<CleanupPreview> {
  const { fromIso, toIso } = bounds(from, to);

  const [orders, leads, expenses] = await Promise.all([
    db()
      .from("orders")
      .select("id, total_amount, cash_confirmed_at")
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .limit(5000),
    db()
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", fromIso)
      .lt("created_at", toIso),
    db()
      .from("company_expenses")
      .select("amount")
      .gte("spent_on", from)
      .lte("spent_on", to)
      .limit(5000),
  ]);

  if (orders.error) throw orders.error;
  if (leads.error) throw leads.error;
  if (expenses.error) throw expenses.error;

  const ids = (orders.data ?? []).map((row) => row.id);

  let invoices = 0;
  if (ids.length > 0) {
    const { count, error } = await db()
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .in("order_id", ids.slice(0, 1000));
    if (error) throw error;
    invoices = count ?? 0;
  }

  return {
    orders: ids.length,
    confirmed: (orders.data ?? []).filter((row) => row.cash_confirmed_at).length,
    turnover: (orders.data ?? []).reduce((sum, row) => sum + (row.total_amount ?? 0), 0),
    leads: leads.count ?? 0,
    invoices,
    expenses: (expenses.data ?? []).length,
    expensesAmount: (expenses.data ?? []).reduce((sum, row) => sum + row.amount, 0),
  };
}

/**
 * Удаляет выбранное за период. Возвращает, что именно было удалено, —
 * это и показывается человеку вместо безликого «готово».
 */
export async function runCleanup(
  from: string,
  to: string,
  scope: CleanupScope,
): Promise<{ orders: number; leads: number; invoices: number; expenses: number }> {
  const { fromIso, toIso } = bounds(from, to);
  const done = { orders: 0, leads: 0, invoices: 0, expenses: 0 };

  if (scope.orders) {
    const ids = await orderIdsIn(from, to);

    // Счета удаляем вместе с заявками: счёт без заявки — документ,
    // за которым ничего не стоит.
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const { data, error } = await db()
        .from("invoices")
        .delete()
        .in("order_id", chunk)
        .select("id");
      if (error) throw error;
      done.invoices += (data ?? []).length;
    }

    const { data, error } = await db()
      .from("orders")
      .delete()
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .select("id");
    if (error) throw error;
    done.orders = (data ?? []).length;
  }

  if (scope.leads) {
    const { data, error } = await db()
      .from("leads")
      .delete()
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .select("id");
    if (error) throw error;
    done.leads = (data ?? []).length;
  }

  if (scope.expenses) {
    const { data, error } = await db()
      .from("company_expenses")
      .delete()
      .gte("spent_on", from)
      .lte("spent_on", to)
      .select("id");
    if (error) throw error;
    done.expenses = (data ?? []).length;
  }

  return done;
}
