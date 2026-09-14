import "server-only";
import { db } from "@/lib/supabase";

/** Доля компании по умолчанию для новых закрытий. */
export async function getDefaultSharePercent(): Promise<number> {
  const { data, error } = await db()
    .from("app_settings")
    .select("default_company_share_percent")
    .eq("id", true)
    .single();

  if (error) throw error;
  return data.default_company_share_percent;
}

export async function setDefaultSharePercent(percent: number): Promise<void> {
  const value = Math.min(100, Math.max(0, Math.round(percent)));
  const { error } = await db()
    .from("app_settings")
    .update({ default_company_share_percent: value, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (error) throw error;
}

/**
 * Ставка налога.
 *
 * Отдельным запросом, а не через getCompany: тот тянет ещё и логотип
 * с печатью — сотни килобайт, которые аналитике ни к чему.
 */
export async function getTaxPercent(): Promise<number> {
  const { data, error } = await db()
    .from("app_settings")
    .select("tax_percent")
    .eq("id", true)
    .single();

  if (error) throw error;
  return Number(data.tax_percent);
}
