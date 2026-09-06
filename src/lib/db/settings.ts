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
