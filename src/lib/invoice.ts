import type { PaymentMethod } from "@/types/db";

/**
 * Счёт на оплату: форма документа и его состояние.
 *
 * Отдельно от слоя базы, потому что этим пользуются и экраны: файл с
 * доступом к базе помечен server-only и в браузер попасть не может.
 */

export type Invoice = {
  id: string;
  number: number;
  created_at: string;
  order_id: string | null;
  buyer_name: string | null;
  buyer_bin: string | null;
  buyer_address: string | null;
  contract_number: string | null;
  contract_date: string | null;
  /** Дата в бланке. Пусто — день создания счёта. */
  issued_on: string | null;
  paid_marked_at: string | null;
  paid_marked_by: string | null;
  payment_method: PaymentMethod;
  confirmed_at: string | null;
  canceled_at: string | null;
  note: string | null;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  position: number;
  title: string;
  price: number;
  quantity: number;
  unit: string;
};

export type InvoiceStatus = "issued" | "awaiting" | "paid" | "canceled";

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  issued: "Выставлен",
  awaiting: "Ждёт подтверждения",
  paid: "Оплачен",
  canceled: "Отменён",
};

/** Состояние счёта считается из отметок, а не хранится отдельным полем. */
export function invoiceStatus(invoice: Invoice): InvoiceStatus {
  if (invoice.canceled_at) return "canceled";
  if (invoice.confirmed_at) return "paid";
  if (invoice.paid_marked_at) return "awaiting";
  return "issued";
}

export function invoiceTotal(items: InvoiceItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
