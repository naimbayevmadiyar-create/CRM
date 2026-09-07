import "server-only";
import { db } from "@/lib/supabase";

/**
 * Позиции заказ-наряда: что именно делали и сколько это стоило.
 *
 * Сумма заказа складывается из этих строк, поэтому перечень и итог
 * не могут разойтись.
 */
export type OrderItem = {
  id: string;
  order_id: string;
  position: number;
  title: string;
  price: number;
  quantity: number;
  warranty_months: number;
};

const COLUMNS = "id, order_id, position, title, price, quantity, warranty_months";

export type OrderItemInput = {
  title: string;
  price: number;
  quantity: number;
  warranty_months?: number;
};

export async function listOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await db()
    .from("order_items")
    .select(COLUMNS)
    .eq("order_id", orderId)
    .order("position");

  if (error) throw error;
  return data as OrderItem[];
}

/** Позиции сразу для нескольких заказов — чтобы не делать запрос в цикле. */
export async function listItemsForOrders(
  orderIds: string[],
): Promise<Map<string, OrderItem[]>> {
  const result = new Map<string, OrderItem[]>();
  if (orderIds.length === 0) return result;

  const { data, error } = await db()
    .from("order_items")
    .select(COLUMNS)
    .in("order_id", orderIds)
    .order("position");

  if (error) throw error;

  for (const item of (data ?? []) as OrderItem[]) {
    const list = result.get(item.order_id) ?? [];
    list.push(item);
    result.set(item.order_id, list);
  }
  return result;
}

/**
 * Полностью заменяет перечень позиций заказа.
 *
 * Замена целиком, а не правка построчно: интерфейс отдаёт готовый список,
 * и так исключены расхождения между тем, что видит человек, и тем,
 * что лежит в базе.
 */
export async function replaceOrderItems(
  orderId: string,
  items: OrderItemInput[],
): Promise<void> {
  const clean = items
    .map((item, index) => ({
      order_id: orderId,
      position: index + 1,
      title: item.title.trim(),
      price: Math.max(0, Math.trunc(item.price) || 0),
      quantity: Math.max(1, Math.trunc(item.quantity) || 1),
      warranty_months: Math.max(0, Math.trunc(item.warranty_months ?? 12)),
    }))
    .filter((item) => item.title.length > 0);

  const { error: removeError } = await db()
    .from("order_items")
    .delete()
    .eq("order_id", orderId);
  if (removeError) throw removeError;

  if (clean.length === 0) return;

  const { error } = await db().from("order_items").insert(clean);
  if (error) throw error;
}

export function itemsTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
