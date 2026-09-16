import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/lib/session";
import { getMasterAuthState } from "@/lib/db/profiles";
import { getAdminAuth } from "@/lib/db/settings";

/**
 * Кто сейчас на той стороне.
 *
 * Единственное место, где страницы узнают роль. Здесь же сверяется версия
 * пароля мастера: сменили пароль или отключили человека — его сессия
 * заканчивается на следующем запросе, остальных это не трогает.
 *
 * В proxy.ts эта сверка не делается намеренно, чтобы не ходить в базу
 * на каждый запрос, включая статику.
 */
export async function getSession(): Promise<SessionPayload | null> {
  // в Next 16 cookies() асинхронный
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? "";

  const payload = await verifySession(token);
  if (!payload) return null;

  if (payload.role === "admin") {
    // сменил пароль — прежние входы, в том числе на других устройствах,
    // становятся недействительными
    const { version } = await getAdminAuth();
    if (payload.pv !== version) return null;
  }

  if (payload.role === "master") {
    if (!payload.masterId) return null;
    const state = await getMasterAuthState(payload.masterId);
    if (!state || !state.is_active || state.password_version !== payload.pv) return null;
  }

  return payload;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");
  return session;
}

export async function requireMaster(): Promise<SessionPayload & { masterId: string }> {
  const session = await getSession();
  if (!session || session.role !== "master" || !session.masterId) redirect("/login");
  return { ...session, masterId: session.masterId };
}

/**
 * Любой вошедший: админ или мастер.
 *
 * Нужна документам — печатать акт и заказ-наряд должен и мастер на выезде,
 * но только по своей заявке. Проверку «своя ли» делает сама страница.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
