import { getSession } from "@/lib/auth";
import { listExpenses } from "@/lib/db/expenses";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/expenseCategory";
import { shortDateRu } from "@/lib/docs";
import { csvResponse, DAY_PATTERN, toCsv } from "@/lib/export/csv";

/** Выписка по расходам компании за период. Только читает. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return new Response("Нужен вход директора", { status: 403 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!DAY_PATTERN.test(from) || !DAY_PATTERN.test(to) || from > to) {
    return new Response("Укажите период: ?from=ГГГГ-ММ-ДД&to=ГГГГ-ММ-ДД", { status: 400 });
  }

  const expenses = await listExpenses(from, to);

  const body = toCsv(
    ["Дата", "На что", "Сумма", "Комментарий"],
    expenses.map((row) => [
      shortDateRu(`${row.spent_on}T12:00:00+05:00`),
      EXPENSE_CATEGORY_LABEL[row.category],
      row.amount,
      row.note ?? "",
    ]),
  );

  return csvResponse(`Расходы ${from} — ${to}`, body);
}
