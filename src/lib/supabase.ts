import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

/**
 * Серверный клиент базы.
 *
 * Работает на сервисном ключе, то есть обходит RLS. Поэтому импорт помечен
 * `server-only`: попытка затащить этот модуль в клиентский компонент
 * сломает сборку, а не утечёт ключ в браузер.
 *
 * Все правила доступа живут в серверном коде выше — в requireAdmin,
 * requireMaster и в проверках владельца заявки.
 */

let client: SupabaseClient<Database> | undefined;

export function db(): SupabaseClient<Database> {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Не заданы SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY. Смотрите .env.example",
    );
  }

  client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
