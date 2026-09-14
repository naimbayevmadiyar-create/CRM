"use server";

import { revalidatePath } from "next/cache";
import { requireMaster } from "@/lib/auth";
import {
  advanceOrderStatus,
  closeOrderWithReport,
  getOrder,
  updateClientDetails,
} from "@/lib/db/orders";
import { getProfile } from "@/lib/db/profiles";
import { getDefaultSharePercent } from "@/lib/db/settings";
import { nextForMaster } from "@/lib/status";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/settlement";
import { replaceOrderItems } from "@/lib/db/orderItems";

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

export type FinishReport = {
  total: number;
  expenses: number;
  expensesNote?: string;
  paymentMethod: string;
  items?: { title: string; price: number; quantity: number }[];
};

/**
 * Закрытие заказа: отчёт и перевод в «Выполнена» одной операцией.
 * Для мастера это одно действие, значит и здесь оно должно быть одним.
 */
export async function finish(
  orderId: string,
  report: FinishReport,
): Promise<ActionResult> {
  const session = await requireMaster();
  const actor = { id: session.masterId, role: "master" as const };

  const paymentMethod = (PAYMENT_METHODS as readonly string[]).includes(
    report.paymentMethod,
  )
    ? (report.paymentMethod as PaymentMethod)
    : null;

  if (!paymentMethod) return { error: "Отметьте, как заплатили" };

  // Процент берём с профиля мастера, а не из формы: у кого-то 50/50,
  // у кого-то 60/40, и менять его вправе только директор.
  const [profile, fallback] = await Promise.all([
    getProfile(session.masterId),
    getDefaultSharePercent(),
  ]);
  const sharePercent = profile?.share_percent ?? fallback;

  try {
    await closeOrderWithReport(
      orderId,
      {
        total: report.total,
        expenses: report.expenses,
        expensesNote: report.expensesNote,
        paymentMethod,
        sharePercent,
      },
      actor,
    );
    if (report.items?.length) {
      await replaceOrderItems(orderId, report.items);
    }
    await advanceOrderStatus(orderId, "done", actor);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось сохранить" };
  }

  revalidatePath("/my");
  revalidatePath("/orders");
  return { ok: true };
}

/**
 * Правка данных клиента с телефона мастера.
 *
 * На месте выясняется и настоящее имя, и точный адрес — диспетчер записывал
 * со слов по телефону. Без этого в акте остаётся «Клиент» и «офис».
 */
export async function saveClient(
  orderId: string,
  patch: { clientName: string; address: string },
): Promise<ActionResult> {
  const session = await requireMaster();

  try {
    await updateClientDetails(
      orderId,
      { client_name: patch.clientName, address: patch.address },
      { id: session.masterId, role: "master" },
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось сохранить" };
  }

  revalidatePath("/my");
  revalidatePath("/orders");
  return { ok: true };
}
