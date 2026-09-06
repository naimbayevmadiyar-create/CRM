import { listOrdersForAdmin } from "@/lib/db/orders";
import { listMasters } from "@/lib/db/profiles";
import { listUnprocessedLeads } from "@/lib/db/leads";
import { OrdersView } from "./OrdersView";

export default async function OrdersPage() {
  // три независимых запроса — идут параллельно, а не друг за другом
  const [orders, masters, leads] = await Promise.all([
    listOrdersForAdmin(),
    listMasters(),
    listUnprocessedLeads(5),
  ]);

  return <OrdersView orders={orders} masters={masters} leads={leads} />;
}
