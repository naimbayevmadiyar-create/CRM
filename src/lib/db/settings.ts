import "server-only";
import { db } from "@/lib/supabase";

/**
 * Версия пароля мастеров.
 *
 * В куке лежит версия на момент входа. Админ меняет пароль — версия растёт,
 * все старые куки перестают совпадать и мастера разлогиниваются мгновенно.
 * Список активных сессий при этом хранить не нужно.
 */

export async function getPasswordVersion(): Promise<number> {
  const { data, error } = await db()
    .from("app_settings")
    .select("master_password_version")
    .eq("id", true)
    .single();

  if (error) throw error;
  return data.master_password_version;
}

export async function bumpPasswordVersion(): Promise<number> {
  const next = (await getPasswordVersion()) + 1;

  const { error } = await db()
    .from("app_settings")
    .update({ master_password_version: next, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (error) throw error;
  return next;
}

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
