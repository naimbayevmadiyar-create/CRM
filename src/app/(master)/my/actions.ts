"use server";

import { revalidatePath } from "next/cache";
import { requireMaster } from "@/lib/auth";
import { advanceOrderStatus, setOrderAmount, getOrder } from "@/lib/db/orders";
import { nextForMaster } from "@/lib/status";

export type ActionResult = { ok?: true; error?: string };

/** Следующий этап определяем на сервере — клиент не диктует, куда переводить. */
export async function advance(orderId: string): Promise<ActionResult> {
  const session = await requireMaster();

  const order = await getOrder(orderId);
  if (!order) return { error: "Заявка не найдена" };

  const next = nextForMaster(order.status);
  if (!next) return { error: "По этой заявке больше нечего отмечать" };

  try {
    await advanceOrderStatus(orderId, next, { id: session.masterId, role: "master" });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось сохранить" };
  }

  revalidatePath("/my");
  return { ok: true };
}

/** Сумму и завершение делаем одной операцией: мастеру это одно действие. */
export async function finish(orderId: string, amount: number): Promise<ActionResult> {
  const session = await requireMaster();
  const actor = { id: session.masterId, role: "master" as const };

  try {
    await setOrderAmount(orderId, amount, actor);
    await advanceOrderStatus(orderId, "done", actor);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось сохранить" };
  }

  revalidatePath("/my");
  return { ok: true };
}
