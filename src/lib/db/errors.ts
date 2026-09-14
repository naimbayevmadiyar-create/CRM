import "server-only";
import { db } from "@/lib/supabase";

export type AppError = {
  id: number;
  created_at: string;
  source: "server" | "client";
  digest: string | null;
  message: string;
  path: string | null;
  route_type: string | null;
  role: string | null;
};

const KEEP_DAYS = 30;

/**
 * Записать ошибку.
 *
 * Сама запись упасть не имеет права: если база недоступна, ошибка про ошибку
 * только завалит страницу окончательно. Поэтому любые сбои здесь глотаются.
 */
export async function logError(entry: {
  source: "server" | "client";
  message: string;
  digest?: string | null;
  path?: string | null;
  method?: string | null;
  routePath?: string | null;
  routeType?: string | null;
  role?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await db()
      .from("app_errors")
      .insert({
        source: entry.source,
        message: entry.message.slice(0, 1000),
        digest: entry.digest?.slice(0, 100) ?? null,
        path: entry.path?.slice(0, 300) ?? null,
        method: entry.method?.slice(0, 10) ?? null,
        route_path: entry.routePath?.slice(0, 300) ?? null,
        route_type: entry.routeType?.slice(0, 30) ?? null,
        role: entry.role ?? null,
        user_agent: entry.userAgent?.slice(0, 300) ?? null,
      });

    // старое чистим тут же — отдельная задача по расписанию ради этого не нужна
    const since = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await db().from("app_errors").delete().lt("created_at", since);
  } catch {
    // намеренно пусто — см. комментарий выше
  }
}

export async function listRecentErrors(limit = 30): Promise<AppError[]> {
  const { data, error } = await db()
    .from("app_errors")
    .select("id, created_at, source, digest, message, path, route_type, role")
    .order("created_at", { ascending: false })
    .limit(limit);

  // журнал — вспомогательный: если таблицы ещё нет, настройки должны открыться
  if (error) return [];
  return (data ?? []) as AppError[];
}
