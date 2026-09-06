import "server-only";
import { db } from "@/lib/supabase";

export type SourceRow = { source: string; orders: number; revenue: number };
export type MasterRow = {
  master: string;
  orders: number;
  revenue: number;
  avg_minutes: number | null;
};
export type ApplianceRow = { appliance: string; orders: number; revenue: number };

export type Analytics = {
  leads: number;
  orders: number;
  done: number;
  canceled: number;
  revenue: number;
  avg_check: number;
  median_minutes_to_departure: number | null;
  by_source: SourceRow[];
  by_master: MasterRow[];
  by_appliance: ApplianceRow[];
};

const EMPTY: Analytics = {
  leads: 0,
  orders: 0,
  done: 0,
  canceled: 0,
  revenue: 0,
  avg_check: 0,
  median_minutes_to_departure: null,
  by_source: [],
  by_master: [],
  by_appliance: [],
};

export async function getAnalytics(from: string, to: string): Promise<Analytics> {
  const { data, error } = await db().rpc("analytics_summary", { p_from: from, p_to: to });
  if (error) throw error;
  if (!data || typeof data !== "object") return EMPTY;
  return { ...EMPTY, ...(data as unknown as Analytics) };
}
