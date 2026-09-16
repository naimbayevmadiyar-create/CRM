import type { Metadata } from "next";
import { TIMEZONE } from "@/lib/format";
import { CleanupView } from "./CleanupView";

export const metadata: Metadata = { title: "Очистка данных" };

export default async function CleanupPage() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return <CleanupView today={today} />;
}
