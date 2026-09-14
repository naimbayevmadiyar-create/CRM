"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  createMaster,
  setMasterActive,
  setMasterPassword,
  updateMaster,
} from "@/lib/db/profiles";

export type MasterFormState = { ok?: true; error?: string };

function parsePercent(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const number = Number(raw);
  if (!Number.isFinite(number)) return null;
  return Math.min(100, Math.max(0, Math.round(number)));
}

export async function addMaster(
  _prev: MasterFormState,
  formData: FormData,
): Promise<MasterFormState> {
  await requireAdmin();

  const name = String(formData.get("full_name") ?? "").trim();
  if (!name) return { error: "Впишите имя — оно будет в актах и отчётах" };

  const password = String(formData.get("password") ?? "");
  if (password && password.length < 6) {
    return { error: "Пароль короче шести символов — так нельзя" };
  }

  try {
    await createMaster({
      full_name: name,
      phone: String(formData.get("phone") ?? "").trim() || undefined,
      password: password || undefined,
      share_percent: parsePercent(formData.get("share_percent")),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось добавить" };
  }

  revalidatePath("/masters");
  return { ok: true };
}

/** Правка данных мастера: имя, телефон и его процент. */
export async function saveMaster(
  _prev: MasterFormState,
  formData: FormData,
): Promise<MasterFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("full_name") ?? "").trim();
  if (!id) return { error: "Мастер не найден" };
  if (!name) return { error: "Имя не может быть пустым" };

  try {
    await updateMaster(id, {
      full_name: name,
      phone: String(formData.get("phone") ?? "").trim() || null,
      share_percent: parsePercent(formData.get("share_percent")),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось сохранить" };
  }

  revalidatePath("/masters");
  revalidatePath("/orders");
  return { ok: true };
}

/**
 * Личный пароль мастера.
 *
 * Пароль у каждого свой, поэтому вход остаётся без логина: система узнаёт
 * человека по паролю. Смена пароля выкидывает только этого мастера —
 * остальные продолжают работать.
 */
export async function changeMasterPassword(
  _prev: MasterFormState,
  formData: FormData,
): Promise<MasterFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!id) return { error: "Мастер не найден" };
  if (password.length < 6) return { error: "Пароль короче шести символов — так нельзя" };

  try {
    await setMasterPassword(id, password);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось сменить пароль" };
  }

  revalidatePath("/masters");
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
  return { ok: true as const };
}
