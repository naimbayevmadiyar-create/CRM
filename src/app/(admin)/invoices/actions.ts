"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  cancelInvoice,
  confirmInvoice,
  createBlankInvoice,
  invoiceForOrder,
  markInvoicePaid,
} from "@/lib/db/invoices";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/settlement";

/** Счёт по заявке: если уже выставляли — откроется тот же, второго не будет. */
export async function invoiceForOrderAction(orderId: string) {
  await requireAdmin();
  const id = await invoiceForOrder(orderId);
  redirect(`/print/invoice/${id}`);
}

export async function newInvoiceAction() {
  await requireAdmin();
  const id = await createBlankInvoice();
  redirect(`/print/invoice/${id}`);
}

export async function markPaidAction(invoiceId: string, method: string) {
  const session = await requireAdmin();
  const payment = (PAYMENT_METHODS as readonly string[]).includes(method)
    ? (method as PaymentMethod)
    : "transfer";

  try {
    await markInvoicePaid(invoiceId, session.masterId, payment);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось отметить" };
  }
  revalidatePath("/invoices");
  return { ok: true as const };
}

/** Подтверждение директора: деньги по счёту действительно пришли. */
export async function confirmInvoiceAction(invoiceId: string) {
  await requireAdmin();
  try {
    await confirmInvoice(invoiceId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось подтвердить" };
  }
  revalidatePath("/invoices");
  return { ok: true as const };
}

export async function cancelInvoiceAction(invoiceId: string) {
  await requireAdmin();
  try {
    await cancelInvoice(invoiceId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось отменить" };
  }
  revalidatePath("/invoices");
  return { ok: true as const };
}
