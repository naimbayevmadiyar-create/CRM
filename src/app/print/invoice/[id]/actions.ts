"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase";

export type BuyerState = { ok?: true; error?: string };

/**
 * Реквизиты плательщика вписываются прямо на странице счёта.
 *
 * Так и происходит в жизни: заявку завели по телефону как обычную, а через
 * день клиент оказался организацией и попросил счёт. Возвращать человека
 * в список заявок и искать форму редактирования — лишний путь.
 */
export async function saveBuyer(
  orderId: string,
  _prev: BuyerState,
  formData: FormData,
): Promise<BuyerState> {
  await requireAdmin();

  const name = String(formData.get("org_name") ?? "").trim();
  if (!name) return { error: "Впишите название организации" };

  const { error } = await db()
    .from("orders")
    .update({
      is_legal_entity: true,
      org_name: name,
      org_bin: String(formData.get("org_bin") ?? "").trim() || null,
      org_address: String(formData.get("org_address") ?? "").trim() || null,
      contract_number: String(formData.get("contract_number") ?? "").trim() || null,
    })
    .eq("id", orderId);

  if (error) return { error: error.message };

  revalidatePath(`/print/invoice/${orderId}`);
  revalidatePath("/orders");
  return { ok: true };
}
