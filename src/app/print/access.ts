import "server-only";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getOrder, type Order } from "@/lib/db/orders";

/**
 * Заявка для печати.
 *
 * Документы печатает и мастер на выезде — акт приёма техники нужен прямо
 * в квартире. Но только по своей заявке: чужую он не увидит даже по прямой
 * ссылке, для него её просто нет.
 */
export async function orderForPrint(id: string): Promise<{
  order: Order;
  backHref: string;
}> {
  const session = await getSession();
  if (!session) redirect("/login");

  const order = await getOrder(id);
  if (!order) notFound();

  if (session.role === "master" && order.master_id !== session.masterId) notFound();

  return { order, backHref: session.role === "master" ? "/my" : "/orders" };
}
