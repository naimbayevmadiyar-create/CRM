import type { Metadata } from "next";
import { getAnalytics } from "@/lib/db/analytics";
import { getCompany } from "@/lib/db/company";
import { listExpenses, summarize } from "@/lib/db/expenses";
import { listPayouts, payoutsTotal } from "@/lib/db/payouts";
import { TIMEZONE } from "@/lib/format";
import { AnalyticsView } from "./AnalyticsView";

export const metadata: Metadata = { title: "Аналитика" };

const ALLOWED_DAYS = [7, 30, 90];

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Какой кусок времени показываем.
 *
 * Три варианта: быстрый период в днях, один день и произвольный диапазон
 * «с — по». Диапазон главнее: его вписали руками, значит именно он и нужен.
 * Границы — по Астане, оба дня включительно.
 */
function resolvePeriod(params: { days?: string; day?: string; from?: string; to?: string }) {
  const span = ALLOWED_DAYS.includes(Number(params.days)) ? Number(params.days) : 30;

  if (DAY.test(params.from ?? "") && DAY.test(params.to ?? "") && params.from! <= params.to!) {
    return {
      span,
      day: null as string | null,
      from: new Date(`${params.from}T00:00:00+05:00`),
      to: new Date(new Date(`${params.to}T00:00:00+05:00`).getTime() + 86_400_000),
      range: { from: params.from as string, to: params.to as string },
    };
  }

  if (DAY.test(params.day ?? "")) {
    const start = new Date(`${params.day}T00:00:00+05:00`);
    return {
      span,
      day: params.day as string,
      from: start,
      to: new Date(start.getTime() + 86_400_000),
      range: null as { from: string; to: string } | null,
    };
  }

  const to = new Date();
  return {
    span,
    day: null as string | null,
    from: new Date(to.getTime() - span * 86_400_000),
    to,
    range: null as { from: string; to: string } | null,
  };
}

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
  searchParams: Promise<{ days?: string; day?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const { span, day: chosenDay, from, to, range } = resolvePeriod(params);

  const [data, company, expenses, payouts] = await Promise.all([
    getAnalytics(from.toISOString(), to.toISOString()),
    getCompany(),
    // расходы и выплаты ведутся по дням, поэтому и берём их по датам
    listExpenses(localDay(from), localDay(new Date(to.getTime() - 1))),
    listPayouts(localDay(from), localDay(new Date(to.getTime() - 1))),
  ]);

  const spent = summarize(expenses);

  return (
    <AnalyticsView
      data={data}
      days={span}
      day={chosenDay}
      range={range}
      taxPercent={company.tax_percent}
      partnerPercent={company.partner_share_percent}
      partnerName={company.partner_name}
      partnerPaid={payoutsTotal(payouts)}
      spent={{
        total: spent.total,
        byCategory: [...spent.byCategory],
        byDay: [...spent.byDay],
      }}
    />
  );
}
