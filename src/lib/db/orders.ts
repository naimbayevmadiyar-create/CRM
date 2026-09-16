import "server-only";
import { db } from "@/lib/supabase";
import { ACTIVE_STATUSES, canTransition, type Status } from "@/lib/status";
import type { Source } from "@/lib/source";
import type { ApplianceKind, ExpensesPayer, PaymentMethod } from "@/types/db";

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
  expenses: number;
  expenses_note: string | null;
  /** Чьи деньги ушли на запчасти. */
  expenses_payer: ExpensesPayer;
  payment_method: PaymentMethod | null;
  company_share_percent: number;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  contract_number: string | null;
  contract_date: string | null;
  is_legal_entity: boolean;
  org_name: string | null;
  org_bin: string | null;
  org_address: string | null;
  at_service_center: boolean;
  source: Source;
  /** Когда директор подтвердил, что деньги по заказу дошли. */
  cash_confirmed_at: string | null;
};

export type Actor = { id?: string; role: "admin" | "master" };

// Строка колонок должна быть цельным литералом: supabase-js разбирает её
// на уровне типов, а склейка через + превращает её в обычный string.
const COLUMNS = "id, number, created_at, client_name, client_phone, address, appliance, problem, status, master_id, scheduled_at, total_amount, expenses, expenses_note, expenses_payer, payment_method, company_share_percent, brand, model, serial_number, contract_number, contract_date, is_legal_entity, org_name, org_bin, org_address, at_service_center, source, cash_confirmed_at";

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

export type OrdersFilter = {
  /** Поиск по телефону, имени или адресу. */
  query?: string;
  /**
   * Один этап, «активные» — все рабочие сразу, «все» — вместе с отменёнными.
   * Ничего не задано — показываем всё, кроме отменённых: они только мешают
   * смотреть на работу.
   */
  status?: Status | "active" | "all" | "unpaid";
  masterId?: string;
  limit?: number;
};

/**
 * Заявки для админки. Фильтрация идёт в базе, а не в браузере:
 * на клиент уезжает ровно то, что показано на экране.
 */
export async function listOrdersForAdmin(filter: OrdersFilter = {}): Promise<Order[]> {
  let request = db().from("orders").select(COLUMNS);

  if (filter.status === "active") {
    request = request.in("status", ACTIVE_STATUSES);
  } else if (filter.status === "unpaid") {
    // работа сделана, а деньги ещё не в кассе
    request = request.eq("status", "done").is("cash_confirmed_at", null);
  } else if (filter.status === "all") {
    // ничего не отсекаем — сюда заходят, когда ищут отменённую заявку
  } else if (filter.status) {
    request = request.eq("status", filter.status);
  } else {
    request = request.neq("status", "canceled");
  }

  if (filter.masterId) request = request.eq("master_id", filter.masterId);

  const query = filter.query?.trim();
  if (query) {
    // цифры телефона ищем отдельно: человек может ввести номер с пробелами
    const digits = query.replace(/\D/g, "");
    const parts = [
      `client_name.ilike.%${query}%`,
      `address.ilike.%${query}%`,
      `problem.ilike.%${query}%`,
    ];
    if (digits.length >= 3) parts.push(`client_phone.ilike.%${digits}%`);
    request = request.or(parts.join(","));
  }

  const { data, error } = await request
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 100);

  if (error) throw error;
  return data as Order[];
}

/**
 * Телефоны, которые обращались больше одного раза.
 *
 * Для сервиса ремонта повторный клиент дешевле нового: его не надо покупать
 * в рекламе. Диспетчер должен видеть таких сразу — и по-другому с ними
 * разговаривать.
 */
export async function findRepeatPhones(phones: string[]): Promise<Set<string>> {
  const unique = [...new Set(phones)].filter(Boolean);
  if (unique.length === 0) return new Set();

  const { data, error } = await db()
    .from("client_stats")
    .select("client_phone, orders_count")
    .in("client_phone", unique)
    .gt("orders_count", 1);

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.client_phone).filter(Boolean) as string[]);
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
  brand?: string;
  model?: string;
  serial_number?: string;
  contract_number?: string;
  is_legal_entity?: boolean;
  org_name?: string;
  org_bin?: string;
  org_address?: string;
  at_service_center?: boolean;
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
      brand: input.brand ?? null,
      model: input.model ?? null,
      serial_number: input.serial_number ?? null,
      contract_number: input.contract_number ?? null,
      is_legal_entity: input.is_legal_entity ?? false,
      org_name: input.org_name ?? null,
      org_bin: input.org_bin ?? null,
      org_address: input.org_address ?? null,
      at_service_center: input.at_service_center ?? false,
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

/**
 * Закрытие заказа с отчётом мастера.
 *
 * Мастер вводит согласованную сумму и расход на запчасти, отмечает способ
 * оплаты. Чистые и доли не хранятся: они считаются из этих чисел в
 * calcSettlement, поэтому не могут разойтись с исходными данными.
 */
export async function closeOrderWithReport(
  id: string,
  report: {
    total: number;
    expenses: number;
    expensesNote?: string;
    expensesPayer: ExpensesPayer;
    paymentMethod: PaymentMethod;
    sharePercent: number;
  },
  actor: Actor,
): Promise<void> {
  if (!Number.isInteger(report.total) || report.total < 0) {
    throw new Error("Сумма должна быть целым числом");
  }
  if (!Number.isInteger(report.expenses) || report.expenses < 0) {
    throw new Error("Стоимость запчастей должна быть целым числом");
  }
  if (report.expenses > report.total) {
    throw new Error("Запчасти дороже согласованной суммы — проверьте цифры");
  }

  const order = await getOrder(id);
  if (!order) throw new Error("Заявка не найдена");
  if (actor.role === "master" && order.master_id !== actor.id) {
    throw new Error("Эта заявка назначена другому мастеру");
  }

  const { error } = await db()
    .from("orders")
    .update({
      total_amount: report.total,
      expenses: report.expenses,
      expenses_note: report.expensesNote?.trim() || null,
      expenses_payer: report.expensesPayer,
      payment_method: report.paymentMethod,
      company_share_percent: report.sharePercent,
    })
    .eq("id", id);

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

export type OrderEvent = {
  id: string;
  from_status: Status | null;
  to_status: Status;
  actor_role: "admin" | "master" | null;
  note: string | null;
  created_at: string;
};

/**
 * История этапов заявки.
 *
 * Её пишет триггер в базе, а не приложение, поэтому по ней видно, как
 * заявка шла на самом деле: когда мастер выехал, когда закрыл, кто отменил.
 */
export async function listOrderHistory(orderId: string): Promise<OrderEvent[]> {
  const { data, error } = await db()
    .from("order_events")
    .select("id, from_status, to_status, actor_role, note, created_at")
    .eq("order_id", orderId)
    .order("created_at");

  if (error) throw error;
  return (data ?? []) as OrderEvent[];
}

/** Заявки мастера, которые он уже закрыл. Нужны, чтобы поднять свой отчёт. */
export async function listClosedOrdersForMaster(
  masterId: string,
  limit = 30,
): Promise<Order[]> {
  const { data, error } = await db()
    .from("orders")
    .select(COLUMNS)
    .eq("master_id", masterId)
    .in("status", ["done", "canceled"])
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Order[];
}

/**
 * Уточнение данных клиента.
 *
 * Мастер на месте узнаёт настоящее имя и точный адрес — телефон и техника
 * при этом не трогаются: их меняет только диспетчер.
 */
export async function updateClientDetails(
  id: string,
  patch: { client_name?: string; address?: string },
  actor: Actor,
): Promise<void> {
  const order = await getOrder(id);
  if (!order) throw new Error("Заявка не найдена");
  if (actor.role === "master" && order.master_id !== actor.id) {
    throw new Error("Эта заявка назначена другому мастеру");
  }

  const { error } = await db()
    .from("orders")
    .update({
      client_name: patch.client_name?.trim() || null,
      address: patch.address?.trim() || null,
    })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Подтверждение, что деньги по заказу получены.
 *
 * Мастер отмечает сумму сам, но пока директор не подтвердил приём, заказ
 * висит как «деньги не в кассе» — по этому признаку и видно, кто сдал,
 * а кто нет.
 */
export async function confirmCash(id: string, adminId?: string): Promise<void> {
  const { error } = await db()
    .from("orders")
    .update({
      cash_confirmed_at: new Date().toISOString(),
      cash_confirmed_by: adminId ?? null,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function revertCash(id: string): Promise<void> {
  const { error } = await db()
    .from("orders")
    .update({ cash_confirmed_at: null, cash_confirmed_by: null })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Правка заявки диспетчером: клиент, техника, время выезда, реквизиты.
 *
 * Дату самой заявки тоже разрешаем менять: работу часто заводят задним
 * числом — сделали в пятницу, записали в понедельник. От этой даты считается
 * и аналитика, и число в акте, поэтому она должна быть настоящей.
 */
export async function updateOrderDetails(
  id: string,
  patch: Partial<{
    created_at: string;
    contract_date: string | null;
    client_name: string | null;
    client_phone: string;
    address: string | null;
    appliance: ApplianceKind;
    problem: string | null;
    scheduled_at: string | null;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
    at_service_center: boolean;
    is_legal_entity: boolean;
    org_name: string | null;
    org_bin: string | null;
    org_address: string | null;
  }>,
): Promise<void> {
  const { error } = await db().from("orders").update(patch).eq("id", id);
  if (error) throw error;
}

/**
 * Закрытые заказы, деньги по которым ещё не приняты.
 *
 * По ним и видно, кто сдал выручку, а кто ходит с ней в кармане.
 */
export async function listUnconfirmedCash(limit = 100): Promise<Order[]> {
  const { data, error } = await db()
    .from("orders")
    .select(COLUMNS)
    .eq("status", "done")
    .is("cash_confirmed_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Order[];
}

/**
 * Промежуточное сохранение отчёта — без закрытия заявки.
 *
 * Ремонт бывает в несколько дней: мастер договорился о цене, вписал работы,
 * а модуль повёз на перепайку. Раньше сохранить можно было только кнопкой
 * «Готово», то есть закрыв заявку, — и заказ-наряд оставался пустым.
 * Способ оплаты и доля здесь не трогаются: они фиксируются при закрытии.
 */
export async function saveOrderDraft(
  id: string,
  draft: {
    total: number;
    expenses: number;
    expensesNote?: string;
    expensesPayer: ExpensesPayer;
  },
  actor: Actor,
): Promise<void> {
  if (!Number.isInteger(draft.total) || draft.total < 0) {
    throw new Error("Сумма должна быть целым числом");
  }
  if (!Number.isInteger(draft.expenses) || draft.expenses < 0) {
    throw new Error("Стоимость запчастей должна быть целым числом");
  }
  if (draft.total > 0 && draft.expenses > draft.total) {
    throw new Error("Запчасти дороже согласованной суммы — проверьте цифры");
  }

  const order = await getOrder(id);
  if (!order) throw new Error("Заявка не найдена");
  if (actor.role === "master" && order.master_id !== actor.id) {
    throw new Error("Эта заявка назначена другому мастеру");
  }
  if (order.status === "done" || order.status === "canceled") {
    throw new Error("Заявка уже закрыта");
  }

  const { error } = await db()
    .from("orders")
    .update({
      // ноль не пишем: пустая сумма в списке честнее, чем «0 ₸»
      total_amount: draft.total > 0 ? draft.total : null,
      expenses: draft.expenses,
      expenses_note: draft.expensesNote?.trim() || null,
      expenses_payer: draft.expensesPayer,
    })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Откат закрытой заявки на исправление отчёта.
 *
 * Мастер ошибся в сумме или в расходе — заявка возвращается на «В работе»,
 * все вписанные суммы и работы остаются, мастер правит и закрывает заново.
 * Способ оплаты и подтверждение кассы сбрасываются: после исправления деньги
 * пересчитываются, и подтверждать их надо заново.
 *
 * Правило доступа от директора: мастер может откатить свою заявку, пока
 * деньги по ней не приняты. После приёма — только директор, в любое время.
 */
export async function reopenOrder(id: string, actor: Actor): Promise<void> {
  const order = await getOrder(id);
  if (!order) throw new Error("Заявка не найдена");
  if (order.status !== "done") {
    throw new Error("Вернуть на исправление можно только выполненную заявку");
  }

  if (actor.role === "master") {
    if (order.master_id !== actor.id) throw new Error("Эта заявка назначена другому мастеру");
    if (order.cash_confirmed_at) {
      throw new Error(
        "Директор уже принял деньги по этой заявке — исправить отчёт теперь может только он",
      );
    }
  }

  const { error } = await db()
    .from("orders")
    .update({
      status: "in_progress",
      payment_method: null,
      cash_confirmed_at: null,
      cash_confirmed_by: null,
    })
    .eq("id", id)
    // защита от гонки: если заявку уже открыли заново, второй раз не трогаем
    .eq("status", "done");

  if (error) throw error;

  // Переход в истории пишет триггер, но без автора. Подписываем его, чтобы
  // директор видел, кто и когда вернул отчёт на исправление.
  const { data: event } = await db()
    .from("order_events")
    .select("id")
    .eq("order_id", id)
    .eq("to_status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (event) {
    await db()
      .from("order_events")
      .update({
        actor_id: actor.role === "master" ? actor.id ?? null : null,
        actor_role: actor.role,
        note: "Отчёт возвращён на исправление",
      })
      .eq("id", event.id);
  }
}

export type StageSummary = {
  counts: {
    new: number;
    assigned: number;
    on_the_way: number;
    in_progress: number;
    waiting_cash: number;
  };
  /** Мастера, у которых одновременно больше одной заявки в пути или на месте. */
  busyMasters: { masterId: string; count: number }[];
  /** Телефоны, у которых больше одной живой заявки — возможно, завели дважды. */
  duplicatePhones: { phone: string; count: number }[];
};

/**
 * Сводка по этапам для шапки списка.
 *
 * Считается отдельно от списка на экране: фильтр и поиск не должны менять
 * цифры «сколько новых, сколько в пути». Закрытые и оплаченные сюда не
 * попадают — это уже не работа.
 */
export async function stageSummary(): Promise<StageSummary> {
  const { data, error } = await db()
    .from("orders")
    .select("status, master_id, client_phone, cash_confirmed_at")
    .or(
      "status.in.(new,assigned,on_the_way,in_progress),and(status.eq.done,cash_confirmed_at.is.null)",
    )
    .limit(2000);

  if (error) throw error;

  const counts = { new: 0, assigned: 0, on_the_way: 0, in_progress: 0, waiting_cash: 0 };
  const perMaster = new Map<string, number>();
  const perPhone = new Map<string, number>();

  for (const row of data ?? []) {
    if (row.status === "done") {
      counts.waiting_cash += 1;
      continue;
    }

    const status = row.status as keyof typeof counts;
    if (status in counts) counts[status] += 1;

    if ((row.status === "on_the_way" || row.status === "in_progress") && row.master_id) {
      perMaster.set(row.master_id, (perMaster.get(row.master_id) ?? 0) + 1);
    }

    const phone = row.client_phone.replace(/\D/g, "").replace(/^8/, "7");
    perPhone.set(phone, (perPhone.get(phone) ?? 0) + 1);
  }

  return {
    counts,
    busyMasters: [...perMaster]
      .filter(([, count]) => count > 1)
      .map(([masterId, count]) => ({ masterId, count })),
    duplicatePhones: [...perPhone]
      .filter(([, count]) => count > 1)
      .map(([phone, count]) => ({ phone, count })),
  };
}
