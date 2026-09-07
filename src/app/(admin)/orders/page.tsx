import type { Metadata } from "next";
import { findRepeatPhones, listOrdersForAdmin, type OrdersFilter } from "@/lib/db/orders";
import { listMasters } from "@/lib/db/profiles";
import { getLead, listUnprocessedLeads } from "@/lib/db/leads";
import { STATUSES, type Status } from "@/lib/status";
import { AutoRefresh } from "@/components/AutoRefresh";
import { OrdersView } from "./OrdersView";

export const metadata: Metadata = { title: "Заявки" };

function parseStatus(value?: string): OrdersFilter["status"] {
  if (value === "active") return "active";
  return (STATUSES as readonly string[]).includes(value ?? "")
    ? (value as Status)
    : undefined;
}

export default async function OrdersPage({
  searchParams,
}: {
  // в Next 16 searchParams — промис
  searchParams: Promise<{ q?: string; status?: string; lead?: string }>;
}) {
  const { q, status, lead } = await searchParams;

  const [orders, masters, leads, fromLead] = await Promise.all([
    listOrdersForAdmin({ query: q, status: parseStatus(status) }),
    listMasters(),
    listUnprocessedLeads(5),
    lead ? getLead(lead) : Promise.resolve(null),
  ]);

  // отдельным запросом, потому что зависит от уже отфильтрованного списка
  const repeatPhones = await findRepeatPhones(orders.map((o) => o.client_phone));

  return (
    <>
      {/* новые обращения с сайта появляются сами */}
      <AutoRefresh seconds={60} />
      <OrdersView
        orders={orders}
        masters={masters}
        leads={leads}
        fromLead={fromLead}
        query={q ?? ""}
        status={status ?? ""}
        repeatPhones={[...repeatPhones]}
      />
    </>
  );
}
