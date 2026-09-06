import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/lib/session";
import { getPasswordVersion } from "@/lib/db/settings";

/**
 * Кто сейчас на той стороне.
 *
 * Единственное место, где страницы узнают роль. Здесь же сверяется версия
 * пароля мастеров: админ сменил пароль — все мастерские сессии отваливаются.
 * В proxy.ts эта сверка не делается намеренно, чтобы не ходить в базу
 * на каждый запрос, включая статику.
 */
export async function getSession(): Promise<SessionPayload | null> {
  // в Next 16 cookies() асинхронный
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? "";

  const payload = await verifySession(token);
  if (!payload) return null;

  if (payload.role === "master") {
    const current = await getPasswordVersion();
    if (payload.pv !== current) return null;
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
  if (!session || session.role !== "master") redirect("/login");
  // пароль ввели, но имя ещё не выбрали
  if (!session.masterId) redirect("/who");
  return { ...session, masterId: session.masterId };
}
