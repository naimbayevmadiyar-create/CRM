import type { ApplianceKind } from "@/types/db";

/**
 * Виды техники. Список закрытый: он же определяет группировку в аналитике
 * и подсказывает, что сервис вообще берёт в ремонт.
 */
export const APPLIANCES: ApplianceKind[] = [
  "washer",
  "dishwasher",
  "dryer",
  "fridge",
  "oven",
  "hood",
  "industrial",
  "other",
];

export const APPLIANCE_LABEL: Record<ApplianceKind, string> = {
  washer: "Стиральная машина",
  dishwasher: "Посудомоечная машина",
  dryer: "Сушильная машина",
  fridge: "Холодильник",
  oven: "Духовка, варочная панель",
  hood: "Вытяжка",
  industrial: "Промышленная техника",
  other: "Другая техника",
};
