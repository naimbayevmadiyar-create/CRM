import type { Metadata } from "next";
import {
  findRepeatPhones,
  listOrdersForAdmin,
  listUnconfirmedCash,
  stageSummary,
  type OrdersFilter,
} from "@/lib/db/orders";
import { calcSettlement } from "@/lib/settlement";
import { listMasters } from "@/lib/db/profiles";
import { getLead, listUnprocessedLeads } from "@/lib/db/leads";
import { STATUSES, type Status } from "@/lib/status";
import { AutoRefresh } from "@/components/AutoRefresh";
import { OrdersView } from "./OrdersView";

export const metadata: Metadata = { title: "Заявки" };

function parseStatus(value?: string): OrdersFilter["status"] {
  if (value === "active") return "active";
  if (value === "all") return "all";
  if (value === "unpaid") return "unpaid";
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

  const [orders, masters, leads, fromLead, unconfirmed, stages] = await Promise.all([
    listOrdersForAdmin({ query: q, status: parseStatus(status) }),
    listMasters(),
    listUnprocessedLeads(5),
    lead ? getLead(lead) : Promise.resolve(null),
    listUnconfirmedCash(),
    stageSummary(),
  ]);

  // Кто ходит с невнесённой выручкой. Считаем только наличные: безнал
  // приходит на счёт сам, мастеру его вносить неоткуда.
  const byMaster = new Map<string, { name: string; amount: number; orders: number }>();
  for (const order of unconfirmed) {
    if (order.payment_method !== "cash" || order.total_amount == null) continue;

    const { amount } = calcSettlement({
      total: order.total_amount,
      expenses: order.expenses,
      expensesPayer: order.expenses_payer,
      sharePercent: order.company_share_percent,
      paymentMethod: "cash",
    });

    const key = order.master_id ?? "none";
    const name = masters.find((m) => m.id === order.master_id)?.full_name ?? "Без мастера";
    const row = byMaster.get(key) ?? { name, amount: 0, orders: 0 };
    row.amount += amount;
    row.orders += 1;
    byMaster.set(key, row);
  }

  const pendingCash = [...byMaster.values()].sort((a, b) => b.amount - a.amount);

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
        pendingCash={pendingCash}
        stages={stages}
      />
    </>
  );
}
