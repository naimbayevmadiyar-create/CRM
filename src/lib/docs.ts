import { TIMEZONE } from "@/lib/format";

/**
 * Общее для печатных бланков.
 *
 * Номер и дата в акте, заказ-наряде, счёте и АВР должны совпадать с заявкой
 * и друг с другом: по ним потом ищут документ и сверяют оплату.
 */

const longDate = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDate = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * Номер документа вида 000-004.
 *
 * Приставка задаётся в настройках: сервис ведёт бумажную нумерацию своими
 * сериями, и номер в CRM должен ложиться в неё, а не жить отдельно.
 */
export function docNumber(number: number, prefix = "000"): string {
  return `${prefix}-${String(number).padStart(3, "0")}`;
}

/** «14 сентября 2026 г.» — для шапки договора и счёта.
    Приписку «г.» добавляет сам Intl, руками её дублировать не надо. */
export function longDateRu(iso: string): string {
  return longDate.format(new Date(iso));
}

/** «14.09.2026» — там, где важна компактность. */
export function shortDateRu(iso: string): string {
  return shortDate.format(new Date(iso));
}

/**
 * Дата договора для бланка.
 *
 * Если её вписали руками — берём её, иначе днём договора считается день
 * заявки: именно тогда договорились об услуге.
 */
export function contractDate(
  contract_date: string | null,
  created_at: string,
): string {
  return shortDateRu(contract_date ?? created_at);
}
