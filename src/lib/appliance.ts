import type { ApplianceKind } from "@/types/db";

/**
 * Виды техники. Список закрытый: он же определяет группировку в аналитике
 * и подсказывает, что сервис вообще берёт в ремонт.
 *
 * Порядок — по частоте заказов: то, что возят каждый день, наверху.
 */
export const APPLIANCES: ApplianceKind[] = [
  "washer",
  "dishwasher",
  "dryer",
  "fridge",
  "oven",
  "hood",
  "microwave",
  "vacuum",
  "iron",
  "hair_dryer",
  "ice_maker",
  "industrial",
  "other",
];

export const APPLIANCE_LABEL: Record<ApplianceKind, string> = {
  washer: "Стиральная машина",
  dishwasher: "Посудомоечная машина",
  dryer: "Сушильная машина",
  fridge: "Холодильник",
  oven: "Духовой шкаф, варочная панель",
  hood: "Вытяжка",
  microwave: "Микроволновка",
  vacuum: "Пылесос",
  iron: "Утюг",
  hair_dryer: "Фен",
  ice_maker: "Ледогенератор",
  industrial: "Промышленная техника",
  other: "Другая техника",
};
