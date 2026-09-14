import "server-only";
import { db } from "@/lib/supabase";
import { listOrderItems } from "@/lib/db/orderItems";
import { getOrder } from "@/lib/db/orders";
import { APPLIANCE_LABEL } from "@/lib/appliance";
import type { PaymentMethod } from "@/types/db";
import type { Invoice, InvoiceItem } from "@/lib/invoice";

export type { Invoice, InvoiceItem } from "@/lib/invoice";
export { invoiceStatus, invoiceTotal, INVOICE_STATUS_LABEL } from "@/lib/invoice";

/**
 * Счета на оплату.
 *
 * Живут отдельно от заявок, потому что просят их не в день ремонта:
 * «мы у вас чинили неделю назад — выставьте счёт». Позиции копируются
 * в счёт при создании: выставленный документ не должен меняться задним
 * числом, если в заявке что-то поправят.
 */

const COLUMNS =
  "id, number, created_at, order_id, buyer_name, buyer_bin, buyer_address, contract_number, contract_date, paid_marked_at, paid_marked_by, payment_method, confirmed_at, canceled_at, note";

const ITEM_COLUMNS = "id, invoice_id, position, title, price, quantity, unit";

/**
 * Счета для админки.
 *
 * Отменённые по умолчанию скрыты: счёт отменили — значит, его больше нет,
 * и висеть в списке он не должен. Посмотреть их всё равно можно отдельно.
 */
export async function listInvoices(
  { includeCanceled = false, limit = 100 } = {},
): Promise<Invoice[]> {
  let request = db().from("invoices").select(COLUMNS);
  if (!includeCanceled) request = request.is("canceled_at", null);

  const { data, error } = await request
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Invoice[];
}

/** Счета по заявкам конкретного мастера — он отмечает по ним оплату. */
export async function listInvoicesForMaster(
  masterId: string,
  limit = 50,
): Promise<Invoice[]> {
  const { data: orders, error: ordersError } = await db()
    .from("orders")
    .select("id")
    .eq("master_id", masterId)
    .limit(200);

  if (ordersError) throw ordersError;
  const ids = (orders ?? []).map((row) => row.id);
  if (ids.length === 0) return [];

  const { data, error } = await db()
    .from("invoices")
    .select(COLUMNS)
    .in("order_id", ids)
    .is("canceled_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Invoice[];
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const { data, error } = await db()
    .from("invoices")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Invoice) ?? null;
}

export async function listInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  const { data, error } = await db()
    .from("invoice_items")
    .select(ITEM_COLUMNS)
    .eq("invoice_id", invoiceId)
    .order("position");

  if (error) throw error;
  return data as InvoiceItem[];
}

/** Позиции сразу для нескольких счетов — чтобы не запрашивать в цикле. */
export async function listItemsForInvoices(
  ids: string[],
): Promise<Map<string, InvoiceItem[]>> {
  const result = new Map<string, InvoiceItem[]>();
  if (ids.length === 0) return result;

  const { data, error } = await db()
    .from("invoice_items")
    .select(ITEM_COLUMNS)
    .in("invoice_id", ids)
    .order("position");

  if (error) throw error;

  for (const item of (data ?? []) as InvoiceItem[]) {
    const list = result.get(item.invoice_id) ?? [];
    list.push(item);
    result.set(item.invoice_id, list);
  }
  return result;
}

type ItemInput = { title: string; price: number; quantity: number; unit?: string };

async function insertItems(invoiceId: string, items: ItemInput[]): Promise<void> {
  const clean = items
    .map((item, index) => ({
      invoice_id: invoiceId,
      position: index + 1,
      title: item.title.trim(),
      price: Math.max(0, Math.trunc(item.price) || 0),
      quantity: Math.max(1, Math.trunc(item.quantity) || 1),
      unit: item.unit?.trim() || "усл",
    }))
    .filter((item) => item.title.length > 0);

  if (clean.length === 0) return;

  const { error } = await db().from("invoice_items").insert(clean);
  if (error) throw error;
}

/**
 * Счёт по заявке.
 *
 * Если счёт по этой заявке уже выставляли — возвращаем его, а не плодим
 * второй: два счёта на один ремонт означают двойную оплату.
 */
export async function invoiceForOrder(orderId: string, adminId?: string): Promise<string> {
  const { data: existing, error: findError } = await db()
    .from("invoices")
    .select("id")
    .eq("order_id", orderId)
    .is("canceled_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing.id;

  const order = await getOrder(orderId);
  if (!order) throw new Error("Заявка не найдена");

  const { data, error } = await db()
    .from("invoices")
    .insert({
      order_id: orderId,
      buyer_name: order.org_name,
      buyer_bin: order.org_bin,
      buyer_address: order.org_address,
      contract_number: order.contract_number,
      contract_date: order.contract_date,
      created_by: adminId ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;

  const items = await listOrderItems(orderId);
  await insertItems(
    data.id,
    items.length > 0
      ? items.map((item) => ({
          title: item.title,
          price: item.price,
          quantity: item.quantity,
        }))
      : [
          {
            title: `Ремонт: ${APPLIANCE_LABEL[order.appliance]}`,
            price: order.total_amount ?? 0,
            quantity: 1,
          },
        ],
  );

  return data.id;
}

/** Счёт без заявки: иногда оплату просят за работу, которой в CRM не было. */
export async function createBlankInvoice(adminId?: string): Promise<string> {
  const { data, error } = await db()
    .from("invoices")
    .insert({ created_by: adminId ?? null })
    .select("id")
    .single();

  if (error) throw error;

  await insertItems(data.id, [{ title: "Ремонт бытовой техники", price: 0, quantity: 1 }]);
  return data.id;
}

export async function updateInvoice(
  id: string,
  patch: Partial<{
    buyer_name: string | null;
    buyer_bin: string | null;
    buyer_address: string | null;
    contract_number: string | null;
    contract_date: string | null;
    note: string | null;
  }>,
): Promise<void> {
  const { error } = await db().from("invoices").update(patch).eq("id", id);
  if (error) throw error;
}

export async function replaceInvoiceItems(
  invoiceId: string,
  items: ItemInput[],
): Promise<void> {
  const { error } = await db().from("invoice_items").delete().eq("invoice_id", invoiceId);
  if (error) throw error;
  await insertItems(invoiceId, items);
}

/**
 * Отметка «оплачено». Ставит мастер или диспетчер — тот, кто увидел деньги.
 * Счёт при этом не считается оплаченным, пока не подтвердит директор.
 */
export async function markInvoicePaid(
  id: string,
  by: string | undefined,
  method: PaymentMethod,
): Promise<void> {
  const { error } = await db()
    .from("invoices")
    .update({
      paid_marked_at: new Date().toISOString(),
      paid_marked_by: by ?? null,
      payment_method: method,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function confirmInvoice(id: string, by?: string): Promise<void> {
  const { error } = await db()
    .from("invoices")
    .update({ confirmed_at: new Date().toISOString(), confirmed_by: by ?? null })
    .eq("id", id);

  if (error) throw error;
}

export async function cancelInvoice(id: string): Promise<void> {
  const { error } = await db()
    .from("invoices")
    .update({ canceled_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
