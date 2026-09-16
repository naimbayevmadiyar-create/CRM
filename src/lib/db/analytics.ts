import "server-only";
import { db } from "@/lib/supabase";

export type SourceRow = {
  source: string;
  orders: number;
  turnover: number;
  net: number;
  company_cut: number;
};

export type MasterRow = {
  master: string;
  orders: number;
  turnover: number;
  /** Запчасти по его заказам — и чьи это были деньги. */
  expenses: number;
  expenses_company: number;
  expenses_master: number;
  net: number;
  company_cut: number;
  avg_minutes: number | null;
};

/** Один день работы: по нему идёт ежедневный расчёт с мастерами. */
export type DayRow = {
  day: string;
  orders: number;
  turnover: number;
  expenses: number;
  expenses_company: number;
  expenses_master: number;
  net: number;
  company_cut: number;
};

export type ApplianceRow = { appliance: string; orders: number; turnover: number };

export type Analytics = {
  leads: number;
  orders: number;
  done: number;
  canceled: number;

  /** Сколько согласовано с клиентами — цена ремонтов. */
  turnover: number;
  /** Запчасти по закрытым заказам — всего. */
  expenses: number;
  /** Из них оплачено деньгами компании и деньгами мастеров. */
  expenses_company: number;
  expenses_master: number;
  /** Оборот минус расход. */
  net: number;
  /** Доля компании от чистых — её реальная прибыль. */
  company_cut: number;
  /** Средняя цена одного ремонта для клиента. */
  avg_check: number;

  cash: number;
  transfer: number;

  median_minutes_to_departure: number | null;
  by_source: SourceRow[];
  by_master: MasterRow[];
  by_appliance: ApplianceRow[];
  by_day: DayRow[];
};

const EMPTY: Analytics = {
  leads: 0,
  orders: 0,
  done: 0,
  canceled: 0,
  turnover: 0,
  expenses: 0,
  expenses_company: 0,
  expenses_master: 0,
  net: 0,
  company_cut: 0,
  avg_check: 0,
  cash: 0,
  transfer: 0,
  median_minutes_to_departure: null,
  by_source: [],
  by_master: [],
  by_appliance: [],
  by_day: [],
};

export async function getAnalytics(from: string, to: string): Promise<Analytics> {
  const { data, error } = await db().rpc("analytics_summary", { p_from: from, p_to: to });
  if (error) throw error;
  if (!data || typeof data !== "object") return EMPTY;
  return { ...EMPTY, ...(data as unknown as Analytics) };
}
