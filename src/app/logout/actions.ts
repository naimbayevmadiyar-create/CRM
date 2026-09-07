"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Выход из системы.
 *
 * Сделано действием формы, а не ссылкой: Next заранее подгружает ссылки
 * при наведении, и обычный переход на /logout выкидывал бы человека
 * из системы просто за то, что он навёл курсор.
 */
export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
