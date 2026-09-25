import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/db/profiles";
import { listOrdersOfMaster } from "@/lib/db/orders";
import { getDefaultSharePercent } from "@/lib/db/settings";
import { TIMEZONE } from "@/lib/format";
import { MasterView } from "./MasterView";

export const metadata: Metadata = { title: "Мастер" };

export default async function MasterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  // в Next 16 params и searchParams — промисы
  searchParams: Promise<{ day?: string }>;
}) {
  const { id } = await params;
  const { day } = await searchParams;

  const [master, orders, fallbackPercent] = await Promise.all([
    getProfile(id),
    listOrdersOfMaster(id),
    getDefaultSharePercent(),
  ]);

  if (!master) notFound();

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <MasterView
      master={master}
      orders={orders}
      day={/^\d{4}-\d{2}-\d{2}$/.test(day ?? "") ? (day as string) : today}
      today={today}
      sharePercent={master.share_percent ?? fallbackPercent}
    />
  );
}
