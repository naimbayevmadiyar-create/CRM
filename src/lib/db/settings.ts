import "server-only";
import { db } from "@/lib/supabase";
import { hashPassword } from "@/lib/passwords";

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

/**
 * Пароль администратора.
 *
 * Хеш лежит в базе, чтобы директор мог сменить пароль сам, из настроек.
 * Пока он ни разу не менялся, входом остаётся ADMIN_PASSWORD_HASH из
 * переменных окружения — иначе после обновления никто бы не вошёл.
 */
export async function getAdminAuth(): Promise<{
  hash: string | null;
  version: number;
}> {
  const { data, error } = await db()
    .from("app_settings")
    .select("admin_password_hash, admin_password_version")
    .eq("id", true)
    .single();

  if (error) throw error;
  return { hash: data.admin_password_hash, version: data.admin_password_version };
}

/** Смена пароля админа. Версия растёт — прежние входы отваливаются. */
export async function setAdminPassword(plain: string): Promise<number> {
  const current = await getAdminAuth();
  const version = current.version + 1;

  const { error } = await db()
    .from("app_settings")
    .update({
      admin_password_hash: hashPassword(plain),
      admin_password_version: version,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) throw error;
  return version;
}
