import type { Metadata } from "next";
import { getAnalytics } from "@/lib/db/analytics";
import { getCompany } from "@/lib/db/company";
import { AnalyticsView } from "./AnalyticsView";

export const metadata: Metadata = { title: "Аналитика" };

const ALLOWED_DAYS = [7, 30, 90];

export default async function AnalyticsPage({
  searchParams,
}: {
  // в Next 16 searchParams — промис
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const parsed = Number(days);
  const span = ALLOWED_DAYS.includes(parsed) ? parsed : 30;

  const to = new Date();
  const from = new Date(to.getTime() - span * 24 * 60 * 60 * 1000);

  const [data, company] = await Promise.all([
    getAnalytics(from.toISOString(), to.toISOString()),
    getCompany(),
  ]);

  return <AnalyticsView data={data} days={span} taxPercent={company.tax_percent} />;
}
