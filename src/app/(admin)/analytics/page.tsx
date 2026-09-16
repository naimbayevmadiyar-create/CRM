import type { Metadata } from "next";
import { getAnalytics } from "@/lib/db/analytics";
import { getCompany } from "@/lib/db/company";
import { listExpenses, summarize } from "@/lib/db/expenses";
import { TIMEZONE } from "@/lib/format";
import { AnalyticsView } from "./AnalyticsView";

export const metadata: Metadata = { title: "Аналитика" };

const ALLOWED_DAYS = [7, 30, 90];

/** Дата в Астане: расходы записаны местными сутками. */
function localDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function AnalyticsPage({
  searchParams,
}: {
  // в Next 16 searchParams — промис
  searchParams: Promise<{ days?: string; day?: string }>;
}) {
  const { days, day } = await searchParams;
  const parsed = Number(days);
  const span = ALLOWED_DAYS.includes(parsed) ? parsed : 30;

  // Один день считаем по Астане: сутки с 00:00 до 00:00 местного времени,
  // иначе вечерние заказы уезжают в соседний день.
  const chosenDay = /^\d{4}-\d{2}-\d{2}$/.test(day ?? "") ? (day as string) : null;

  const to = chosenDay
    ? new Date(new Date(`${chosenDay}T00:00:00+05:00`).getTime() + 24 * 60 * 60 * 1000)
    : new Date();
  const from = chosenDay
    ? new Date(`${chosenDay}T00:00:00+05:00`)
    : new Date(to.getTime() - span * 24 * 60 * 60 * 1000);

  const [data, company, expenses] = await Promise.all([
    getAnalytics(from.toISOString(), to.toISOString()),
    getCompany(),
    // расходы компании ведутся по дням, поэтому и берём их по датам
    listExpenses(localDay(from), localDay(new Date(to.getTime() - 1))),
  ]);

  const spent = summarize(expenses);

  return (
    <AnalyticsView
      data={data}
      days={span}
      day={chosenDay}
      taxPercent={company.tax_percent}
      partnerPercent={company.partner_share_percent}
      partnerName={company.partner_name}
      spent={{
        total: spent.total,
        byCategory: [...spent.byCategory],
        byDay: [...spent.byDay],
      }}
    />
  );
}
