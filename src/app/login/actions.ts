"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { verifyPassword } from "@/lib/passwords";
import { signSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/session";
import { getPasswordVersion } from "@/lib/db/settings";
import { db } from "@/lib/supabase";

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 10;

export type LoginState = { error?: string };

/** IP не храним — только его хеш с солью. Нужен для счётчика попыток, не для слежки. */
async function ipHash(): Promise<string> {
  const h = await headers(); // в Next 16 headers() асинхронный
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256")
    .update(ip + (process.env.IP_HASH_SALT ?? ""))
    .digest("hex");
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const hash = await ipHash();
  const since = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();

  const { count } = await db()
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", hash)
    .gte("created_at", since);

  if ((count ?? 0) >= MAX_ATTEMPTS) {
    return { error: "Слишком много попыток. Попробуйте через 15 минут." };
  }

  const adminHash = process.env.ADMIN_PASSWORD_HASH ?? "";
  const masterHash = process.env.MASTER_PASSWORD_HASH ?? "";
  const store = await cookies();

  if (adminHash && verifyPassword(password, adminHash)) {
    // у админа версия пароля мастеров не проверяется, поэтому храним ноль
    const token = await signSession({ role: "admin", pv: 0 });
    store.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    redirect("/orders");
  }

  if (masterHash && verifyPassword(password, masterHash)) {
    const pv = await getPasswordVersion();
    const token = await signSession({ role: "master", pv });
    store.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    redirect("/who");
  }

  await db().from("auth_attempts").insert({ ip_hash: hash });
  // таблица попыток нужна только на длину окна — старое чистим сразу,
  // иначе она растёт вечно и без всякой пользы
  await db().from("auth_attempts").delete().lt("created_at", since);

  return { error: "Неверный пароль" };
}
