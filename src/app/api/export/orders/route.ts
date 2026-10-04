import { getSession } from "@/lib/auth";
import { listOrdersForExport } from "@/lib/db/orders";
import { listMasters } from "@/lib/db/profiles";
import { APPLIANCE_LABEL } from "@/lib/appliance";
import { SOURCE_LABEL, type Source } from "@/lib/source";
import { STATUS_LABEL } from "@/lib/status";
import { calcSettlement, PAYMENT_LABEL } from "@/lib/settlement";
import { formatPhone } from "@/lib/format";
import { shortDateRu } from "@/lib/docs";
import { csvResponse, DAY_PATTERN, rangeBounds, toCsv } from "@/lib/export/csv";

/**
 * Выписка по заявкам за период — таблицей для Excel.
 *
 * Сводный отчёт отвечает «сколько всего», а выписка — «из чего это сложилось»:
 * строка на заявку, с деньгами, мастером и обеими датами, по заявке и по
 * приёму денег. Ничего не меняет и не удаляет: только читает.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return new Response("Нужен вход директора", { status: 403 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!DAY_PATTERN.test(from) || !DAY_PATTERN.test(to) || from > to) {
    return new Response("Укажите период: ?from=ГГГГ-ММ-ДД&to=ГГГГ-ММ-ДД", { status: 400 });
  }

  const { fromIso, toIso } = rangeBounds(from, to);
  const [orders, masters] = await Promise.all([
    listOrdersForExport(fromIso, toIso),
    listMasters(false),
  ]);

  const nameOf = (id: string | null) =>
    masters.find((master) => master.id === id)?.full_name ?? "";

  const rows = orders.map((order) => {
    const total = order.total_amount ?? 0;
    const settlement = calcSettlement({
      total,
      expenses: order.expenses,
      expensesPayer: order.expenses_payer,
      sharePercent: order.company_share_percent,
      paymentMethod: order.payment_method ?? "cash",
    });

    const closed = order.status === "done";

    return [
      order.number,
      shortDateRu(order.created_at),
      order.cash_confirmed_at ? shortDateRu(order.cash_confirmed_at) : "",
      STATUS_LABEL[order.status],
      order.client_name ?? "",
      formatPhone(order.client_phone),
      order.at_service_center ? "Сервисный центр" : (order.address ?? ""),
      APPLIANCE_LABEL[order.appliance],
      order.problem ?? "",
      nameOf(order.master_id),
      SOURCE_LABEL[order.source as Source] ?? order.source,
      total || "",
      order.expenses || "",
      order.expenses > 0 ? (order.expenses_payer === "master" ? "мастер" : "компания") : "",
      closed ? settlement.net : "",
      closed ? settlement.masterCut + settlement.reimbursement : "",
      closed ? settlement.companyCut : "",
      order.payment_method ? PAYMENT_LABEL[order.payment_method] : "",
      closed && order.payment_method
        ? settlement.direction === "master_owes"
          ? settlement.amount
          : -settlement.amount
        : "",
      order.cash_confirmed_at ? "да" : "нет",
    ];
  });

  const body = toCsv(
    [
      "Номер",
      "Дата заявки",
      "Дата приёма денег",
      "Этап",
      "Клиент",
      "Телефон",
      "Адрес",
      "Техника",
      "Неисправность",
      "Мастер",
      "Источник",
      "Согласовано",
      "Запчасти",
      "Чей расход",
      "Чистыми",
      "Мастеру",
      "Прибыль компании",
      "Оплата",
      "В кассу (минус — выплата мастеру)",
      "Деньги приняты",
    ],
    rows,
  );

  return csvResponse(`Заявки ${from} — ${to}`, body);
}
