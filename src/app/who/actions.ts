"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getProfile } from "@/lib/db/profiles";
import { signSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/session";

/**
 * Мастер выбирает своё имя один раз, дальше устройство помнит выбор.
 * Имя переезжает в подписанную куку, поэтому подменить его подбором
 * идентификатора в адресной строке нельзя.
 */
export async function chooseMaster(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "master") redirect("/login");

  const masterId = String(formData.get("masterId") ?? "");
  if (!masterId) redirect("/who");

  // проверяем, что такой мастер вообще существует и не отключён
  const profile = await getProfile(masterId);
  if (!profile || profile.role !== "master" || !profile.is_active) redirect("/who");

  const token = await signSession({ role: "master", masterId, pv: session.pv });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

  redirect("/my");
}
