"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { assignMaster, cancelOrder, createOrder, getOrder } from "@/lib/db/orders";
import { attachLeadToOrder } from "@/lib/db/leads";
import { notifyOrder } from "@/lib/telegram";
import { APPLIANCE_LABEL } from "@/lib/appliance";
import { SOURCES, type Source } from "@/lib/source";
import { APPLIANCES } from "@/lib/appliance";
import type { ApplianceKind } from "@/types/db";

export type OrderFormState = { ok?: true; error?: string };

function pick<T extends string>(value: FormDataEntryValue | null, allowed: readonly T[], fallback: T): T {
  const raw = String(value ?? "");
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

export async function createOrderAction(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  await requireAdmin();

  const phone = String(formData.get("client_phone") ?? "").trim();
  if (phone.replace(/\D/g, "").length < 10) {
    return { error: "Укажите телефон клиента — без него заявка бесполезна" };
  }

  const leadId = String(formData.get("lead_id") ?? "") || undefined;
  const masterId = String(formData.get("master_id") ?? "") || undefined;
  const appliance = pick<ApplianceKind>(formData.get("appliance"), APPLIANCES, "other");
  const source = pick<Source>(formData.get("source"), SOURCES, "direct");

  try {
    const orderId = await createOrder({
      client_phone: phone,
      client_name: String(formData.get("client_name") ?? "").trim() || undefined,
      address: String(formData.get("address") ?? "").trim() || undefined,
      appliance,
      problem: String(formData.get("problem") ?? "").trim() || undefined,
      master_id: masterId,
      source,
      lead_id: leadId,
    });

    if (leadId) await attachLeadToOrder(leadId, orderId);

    const created = await getOrder(orderId);
    if (created) {
      await notifyOrder({
        number: created.number,
        client_phone: created.client_phone,
        appliance: APPLIANCE_LABEL[created.appliance],
        source: created.source,
      });
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось создать заявку" };
  }

  revalidatePath("/orders");
  revalidatePath("/leads");
  return { ok: true };
}

export async function assignAction(orderId: string, masterId: string) {
  await requireAdmin();
  try {
    await assignMaster(orderId, masterId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось назначить" };
  }
  revalidatePath("/orders");
  return { ok: true as const };
}

export async function cancelAction(orderId: string, reason: string) {
  await requireAdmin();
  try {
    await cancelOrder(orderId, reason, { role: "admin" });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось отменить" };
  }
  revalidatePath("/orders");
  return { ok: true as const };
}
