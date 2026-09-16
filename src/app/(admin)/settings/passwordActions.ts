"use server";

import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { getAdminAuth, setAdminPassword } from "@/lib/db/settings";
import { verifyPassword } from "@/lib/passwords";
import { signSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/session";

export type PasswordState = { ok?: true; error?: string };

const MIN_LENGTH = 8;

/**
 * Смена пароля администратора.
 *
 * Старый пароль спрашиваем всегда: экран мог остаться открытым на чужом
 * компьютере. После смены все прежние входы — на других устройствах —
 * становятся недействительными, а текущему сразу выдаётся свежая кука,
 * чтобы человека не выкинуло из системы в момент смены.
 */
export async function changeAdminPassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  await requireAdmin();

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const repeat = String(formData.get("repeat") ?? "");

  if (next.length < MIN_LENGTH) {
    return { error: `Новый пароль короче ${MIN_LENGTH} символов — так нельзя` };
  }
  if (next !== repeat) return { error: "Новый пароль и повтор не совпадают" };
  if (next === current) return { error: "Новый пароль совпадает со старым" };

  const admin = await getAdminAuth();
  const stored = admin.hash ?? process.env.ADMIN_PASSWORD_HASH ?? "";
  if (!stored || !verifyPassword(current, stored)) {
    return { error: "Текущий пароль введён неверно" };
  }

  try {
    const version = await setAdminPassword(next);

    // сразу переподписываем свою куку под новую версию
    const store = await cookies();
    store.set(
      SESSION_COOKIE,
      await signSession({ role: "admin", pv: version }),
      SESSION_COOKIE_OPTIONS,
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось сменить пароль" };
  }

  return { ok: true };
}
