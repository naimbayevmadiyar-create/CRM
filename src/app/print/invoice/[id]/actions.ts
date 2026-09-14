"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { replaceInvoiceItems, updateInvoice } from "@/lib/db/invoices";

export type BuyerState = { ok?: true; error?: string };

/**
 * Реквизиты плательщика и строки счёта правятся прямо на странице счёта.
 *
 * Так и происходит в жизни: ремонт сделали неделю назад, а сегодня клиент
 * просит счёт на организацию и называет реквизиты по телефону. Идти за ними
 * в карточку заявки — лишний путь.
 */
export async function saveBuyer(
  invoiceId: string,
  _prev: BuyerState,
  formData: FormData,
): Promise<BuyerState> {
  await requireAdmin();

  const name = String(formData.get("buyer_name") ?? "").trim();
  if (!name) return { error: "Впишите название организации" };

  const titles = formData.getAll("item_title").map(String);
  const prices = formData.getAll("item_price").map(String);
  const quantities = formData.getAll("item_quantity").map(String);

  const items = titles
    .map((title, index) => ({
      title: title.trim(),
      price: Number(prices[index]?.replace(/\D/g, "")) || 0,
      quantity: Number(quantities[index]?.replace(/\D/g, "")) || 1,
    }))
    .filter((item) => item.title.length > 0);

  if (items.length === 0) return { error: "В счёте должна быть хотя бы одна строка" };

  try {
    await updateInvoice(invoiceId, {
      buyer_name: name,
      buyer_bin: String(formData.get("buyer_bin") ?? "").trim() || null,
      buyer_address: String(formData.get("buyer_address") ?? "").trim() || null,
      contract_number: String(formData.get("contract_number") ?? "").trim() || null,
      issued_on: String(formData.get("issued_on") ?? "").trim() || null,
    });
    await replaceInvoiceItems(invoiceId, items);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось сохранить" };
  }

  revalidatePath(`/print/invoice/${invoiceId}`);
  revalidatePath(`/print/avr/${invoiceId}`);
  revalidatePath("/invoices");
  return { ok: true };
}
