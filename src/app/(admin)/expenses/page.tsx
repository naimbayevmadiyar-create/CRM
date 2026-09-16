import type { Metadata } from "next";
import { listExpenses, summarize } from "@/lib/db/expenses";
import { TIMEZONE } from "@/lib/format";
import { ExpensesView } from "./ExpensesView";

export const metadata: Metadata = { title: "Расходы" };

const ALLOWED_DAYS = [7, 30, 90];

/** Дата в Астане: расходы ведутся по местным суткам, как и вся касса. */
function localDay(shiftDays = 0): string {
  const date = new Date(Date.now() + shiftDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function ExpensesPage({
  searchParams,
}: {
  // в Next 16 searchParams — промис
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const parsed = Number(days);
  const span = ALLOWED_DAYS.includes(parsed) ? parsed : 30;

  const expenses = await listExpenses(localDay(-span), localDay());
  const totals = summarize(expenses);

  return (
    <ExpensesView
      expenses={expenses}
      days={span}
      today={localDay()}
      total={totals.total}
      byCategory={[...totals.byCategory]}
    />
  );
}
