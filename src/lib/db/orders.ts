import "server-only";
import { db } from "@/lib/supabase";
import { ACTIVE_STATUSES, canTransition, type Status } from "@/lib/status";
import type { Source } from "@/lib/source";
import type { ApplianceKind } from "@/types/db";

export type Order = {
  id: string;
  number: number;
  created_at: string;
  client_name: string | null;
  client_phone: string;
  address: string | null;
  appliance: ApplianceKind;
  problem: string | null;
  status: Status;
  master_id: string | null;
  scheduled_at: string | null;
  total_amount: number | null;
  source: Source;
};

export type Actor = { id?: string; role: "admin" | "master" };

// Строка колонок должна быть цельным литералом: supabase-js разбирает её
// на уровне типов, а склейка через + превращает её в обычный string.
const COLUMNS = "id, number, created_at, client_name, client_phone, address, appliance, problem, status, master_id, scheduled_at, total_amount, source";

/** Заявки мастера: только его и только активные. Архив ему не нужен. */
export async function listOrdersForMaster(masterId: string): Promise<Order[]> {
  const { data, error } = await db()
    .from("orders")
    .select(COLUMNS)
    .eq("master_id", masterId)
    .in("status", ACTIVE_STATUSES)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(50);

  if (error) throw error;
  return data as Order[];
}

export async function listOrdersForAdmin(limit = 100): Promise<Order[]> {
  const { data, error } = await db()
    .from("orders")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Order[];
}

export async function getOrder(id: string): Promise<Order | null> {
  const { data, error } = await db()
    .from("orders")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Order) ?? null;
}

export async function createOrder(input: {
  client_phone: string;
  client_name?: string;
  address?: string;
  appliance?: ApplianceKind;
  problem?: string;
  master_id?: string;
  scheduled_at?: string;
  source?: Source;
  lead_id?: string;
  created_by?: string;
}): Promise<string> {
  const { data, error } = await db()
    .from("orders")
    .insert({
      client_phone: input.client_phone,
      client_name: input.client_name ?? null,
      address: input.address ?? null,
      appliance: input.appliance ?? "other",
      problem: input.problem ?? null,
      master_id: input.master_id ?? null,
      scheduled_at: input.scheduled_at ?? null,
      source: input.source ?? "direct",
      lead_id: input.lead_id ?? null,
      created_by: input.created_by ?? null,
      // назначили мастера сразу — заявка минует этап «Новая»
      status: input.master_id ? "assigned" : "new",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Перевод заявки на следующий этап.
 *
 * Разрешение спрашиваем у машины этапов, а принадлежность заявки проверяем
 * здесь же. Интерфейс мастера рисует только допустимую кнопку, но полагаться
 * на это нельзя: запрос может прийти откуда угодно.
 */
export async function advanceOrderStatus(
  id: string,
  to: Status,
  actor: Actor,
): Promise<void> {
  const order = await getOrder(id);
  if (!order) throw new Error("Заявка не найдена");

  if (actor.role === "master" && order.master_id !== actor.id) {
    throw new Error("Эта заявка назначена другому мастеру");
  }
  if (!canTransition(order.status, to)) {
    throw new Error("Этот переход невозможен — обновите страницу");
  }

  const { error } = await db().from("orders").update({ status: to }).eq("id", id);
  if (error) throw error;
}

export async function setOrderAmount(
  id: string,
  amount: number,
  actor: Actor,
): Promise<void> {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("Сумма должна быть целым числом");
  }

  const order = await getOrder(id);
  if (!order) throw new Error("Заявка не найдена");
  if (actor.role === "master" && order.master_id !== actor.id) {
    throw new Error("Эта заявка назначена другому мастеру");
  }

  const { error } = await db().from("orders").update({ total_amount: amount }).eq("id", id);
  if (error) throw error;
}

export async function assignMaster(orderId: string, masterId: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error("Заявка не найдена");

  const patch: { master_id: string; status?: Status } = { master_id: masterId };
  if (order.status === "new") patch.status = "assigned";

  const { error } = await db().from("orders").update(patch).eq("id", orderId);
  if (error) throw error;
}

export async function cancelOrder(
  id: string,
  reason: string,
  actor: Actor,
): Promise<void> {
  const order = await getOrder(id);
  if (!order) throw new Error("Заявка не найдена");

  if (actor.role === "master" && order.master_id !== actor.id) {
    throw new Error("Эта заявка назначена другому мастеру");
  }
  if (!canTransition(order.status, "canceled")) {
    throw new Error("Эту заявку уже нельзя отменить");
  }

  const { error } = await db()
    .from("orders")
    .update({ status: "canceled", cancel_reason: reason || null })
    .eq("id", id);
  if (error) throw error;
}
