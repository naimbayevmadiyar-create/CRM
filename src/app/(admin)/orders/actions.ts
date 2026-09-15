"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  assignMaster,
  cancelOrder,
  confirmCash,
  createOrder,
  getOrder,
  listOrderHistory,
  reopenOrder,
  revertCash,
  updateOrderDetails,
  type OrderEvent,
} from "@/lib/db/orders";
import { listOrderItems, type OrderItem } from "@/lib/db/orderItems";
import { attachLeadToOrder } from "@/lib/db/leads";
import { notifyOrder } from "@/lib/telegram";
import { APPLIANCES, APPLIANCE_LABEL } from "@/lib/appliance";
import { localInputToIso } from "@/lib/format";
import { SOURCES, type Source } from "@/lib/source";
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
      // поле формы отдаёт местное время без пояса — переводим явно
      scheduled_at: localInputToIso(String(formData.get("scheduled_at") ?? "")),
      brand: String(formData.get("brand") ?? "").trim() || undefined,
      model: String(formData.get("model") ?? "").trim() || undefined,
      serial_number: String(formData.get("serial_number") ?? "").trim() || undefined,
      is_legal_entity: formData.get("is_legal_entity") === "on",
      org_name: String(formData.get("org_name") ?? "").trim() || undefined,
      org_bin: String(formData.get("org_bin") ?? "").trim() || undefined,
      org_address: String(formData.get("org_address") ?? "").trim() || undefined,
      at_service_center: formData.get("at_service_center") === "on",
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

  // Уводим на чистый адрес: форма закрывается сама, ?lead из строки уходит.
  // Делать это эффектом на клиенте не нужно — сервер и так знает, что готово.
  redirect("/orders");
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

export type OrderDetails = {
  items: OrderItem[];
  history: OrderEvent[];
};

/**
 * Подробности одной заявки — перечень работ и история этапов.
 *
 * Грузятся по требованию, когда карточку раскрыли: в списке из сотни заявок
 * тянуть всё это сразу незачем, а открывают обычно одну-две.
 */
export async function orderDetailsAction(
  orderId: string,
): Promise<OrderDetails | { error: string }> {
  await requireAdmin();
  try {
    const [items, history] = await Promise.all([
      listOrderItems(orderId),
      listOrderHistory(orderId),
    ]);
    return { items, history };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось открыть заявку" };
  }
}

/**
 * Деньги по заказу дошли до кассы.
 *
 * Мастер отмечает сумму сам, но пока директор не подтвердил приём, заказ
 * висит как «не в кассе». Так и видно, кто сдал, а кто нет.
 */
export async function confirmCashAction(orderId: string) {
  const session = await requireAdmin();
  try {
    await confirmCash(orderId, session.masterId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось подтвердить" };
  }
  revalidatePath("/orders");
  revalidatePath("/analytics");
  return { ok: true as const };
}

export async function revertCashAction(orderId: string) {
  await requireAdmin();
  try {
    await revertCash(orderId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось отменить" };
  }
  revalidatePath("/orders");
  revalidatePath("/analytics");
  return { ok: true as const };
}

/** Правка уже созданной заявки: диспетчер уточняет всё, кроме денег. */
export async function updateOrderAction(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Заявка не найдена" };

  const phone = String(formData.get("client_phone") ?? "").trim();
  if (phone.replace(/\D/g, "").length < 10) {
    return { error: "Телефон клиента нужен целиком" };
  }

  const atServiceCenter = formData.get("at_service_center") === "on";

  // дату заявки правим только если её действительно вписали
  const createdAt = localInputToIso(String(formData.get("created_at") ?? ""));

  try {
    await updateOrderDetails(id, {
      ...(createdAt ? { created_at: createdAt } : {}),
      contract_date: String(formData.get("contract_date") ?? "").trim() || null,
      client_name: String(formData.get("client_name") ?? "").trim() || null,
      client_phone: phone,
      address: atServiceCenter
        ? null
        : String(formData.get("address") ?? "").trim() || null,
      at_service_center: atServiceCenter,
      appliance: pick<ApplianceKind>(formData.get("appliance"), APPLIANCES, "other"),
      problem: String(formData.get("problem") ?? "").trim() || null,
      scheduled_at: localInputToIso(String(formData.get("scheduled_at") ?? "")) ?? null,
      brand: String(formData.get("brand") ?? "").trim() || null,
      model: String(formData.get("model") ?? "").trim() || null,
      serial_number: String(formData.get("serial_number") ?? "").trim() || null,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось сохранить" };
  }

  revalidatePath("/orders");
  return { ok: true };
}

/**
 * Вернуть отчёт мастеру на исправление.
 * Директору можно всегда — даже когда деньги уже приняты.
 */
export async function reopenOrderAction(orderId: string) {
  await requireAdmin();
  try {
    await reopenOrder(orderId, { role: "admin" });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось вернуть заявку" };
  }
  revalidatePath("/orders");
  revalidatePath("/my");
  revalidatePath("/analytics");
  return { ok: true as const };
}
