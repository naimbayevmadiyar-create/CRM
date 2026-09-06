"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createMaster, setMasterActive } from "@/lib/db/profiles";
import { bumpPasswordVersion } from "@/lib/db/settings";
import { hashPassword } from "@/lib/passwords";

export type MasterFormState = { ok?: true; error?: string };

export async function addMaster(
  _prev: MasterFormState,
  formData: FormData,
): Promise<MasterFormState> {
  await requireAdmin();

  const name = String(formData.get("full_name") ?? "").trim();
  if (!name) return { error: "Впишите имя — мастер будет искать его в списке" };

  try {
    await createMaster({
      full_name: name,
      phone: String(formData.get("phone") ?? "").trim() || undefined,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось добавить" };
  }

  revalidatePath("/masters");
  revalidatePath("/who");
  return { ok: true };
}

export async function toggleMaster(id: string, isActive: boolean) {
  await requireAdmin();
  try {
    await setMasterActive(id, isActive);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось изменить" };
  }
  revalidatePath("/masters");
  revalidatePath("/who");
  return { ok: true as const };
}

export type RotateState = { hash?: string; version?: number; error?: string };

/**
 * Смена пароля мастеров.
 *
 * Версия поднимается сразу — все мастера разлогиниваются в тот же миг.
 * А новый хеш админ кладёт в переменную окружения руками: держать хеш
 * пароля в базе, к которой у приложения есть полный доступ, — худший
 * из вариантов. Один ручной шаг здесь дешевле этого риска.
 */
export async function rotateMasterPassword(
  _prev: RotateState,
  formData: FormData,
): Promise<RotateState> {
  await requireAdmin();

  const plain = String(formData.get("password") ?? "");
  if (plain.length < 6) return { error: "Пароль короче шести символов — так нельзя" };

  try {
    const hash = hashPassword(plain);
    const version = await bumpPasswordVersion();
    revalidatePath("/masters");
    return { hash, version };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось сменить пароль" };
  }
}
