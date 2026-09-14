import "server-only";
import { db } from "@/lib/supabase";
import { hashPassword } from "@/lib/passwords";
import type { UserRole } from "@/types/db";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  /** Доля компании для этого мастера. Пусто — берётся общая из настроек. */
  share_percent: number | null;
  /** Задан ли личный пароль. Сам хеш наружу не отдаём. */
  has_password: boolean;
};

const COLUMNS = "id, full_name, phone, role, is_active, share_percent, password_hash";

type Row = Omit<Profile, "has_password"> & { password_hash: string | null };

function toProfile(row: Row): Profile {
  const { password_hash, ...rest } = row;
  return { ...rest, has_password: Boolean(password_hash) };
}

/** Мастера для назначения на заявку и для списка в админке. */
export async function listMasters(onlyActive = true): Promise<Profile[]> {
  let query = db()
    .from("profiles")
    .select(COLUMNS)
    .eq("role", "master")
    .order("full_name");

  if (onlyActive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw error;
  return (data as Row[]).map(toProfile);
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await db()
    .from("profiles")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toProfile(data as Row) : null;
}

export async function createMaster(input: {
  full_name: string;
  phone?: string;
  password?: string;
  share_percent?: number | null;
}): Promise<void> {
  const { error } = await db()
    .from("profiles")
    .insert({
      full_name: input.full_name,
      phone: input.phone ?? null,
      role: "master",
      share_percent: input.share_percent ?? null,
      password_hash: input.password ? hashPassword(input.password) : null,
    });
  if (error) throw error;
}

export async function updateMaster(
  id: string,
  patch: { full_name?: string; phone?: string | null; share_percent?: number | null },
): Promise<void> {
  const { error } = await db()
    .from("profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("role", "master");
  if (error) throw error;
}

/** Отключённый мастер пропадает из назначения и не может войти. */
export async function setMasterActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await db()
    .from("profiles")
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Личный пароль мастера.
 *
 * Версия поднимается тем же запросом: у этого мастера все входы на старом
 * пароле становятся недействительными сразу, остальных это не касается.
 */
export async function setMasterPassword(id: string, plain: string): Promise<void> {
  const { data, error: readError } = await db()
    .from("profiles")
    .select("password_version")
    .eq("id", id)
    .single();
  if (readError) throw readError;

  const { error } = await db()
    .from("profiles")
    .update({
      password_hash: hashPassword(plain),
      password_version: (data?.password_version ?? 1) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("role", "master");
  if (error) throw error;
}

export type MasterCredentials = {
  id: string;
  full_name: string;
  password_hash: string;
  password_version: number;
};

/**
 * Пароли активных мастеров для проверки входа.
 *
 * Логина в системе нет: человек вводит только пароль, а кто он — понимаем
 * по тому, чей хеш совпал. Поэтому список нужен целиком.
 */
export async function listMasterCredentials(): Promise<MasterCredentials[]> {
  const { data, error } = await db()
    .from("profiles")
    .select("id, full_name, password_hash, password_version")
    .eq("role", "master")
    .eq("is_active", true)
    .not("password_hash", "is", null);

  if (error) throw error;
  return (data ?? []) as MasterCredentials[];
}

/** Состояние мастера для проверки его сессии на каждом запросе. */
export async function getMasterAuthState(
  id: string,
): Promise<{ password_version: number; is_active: boolean } | null> {
  const { data, error } = await db()
    .from("profiles")
    .select("password_version, is_active")
    .eq("id", id)
    .eq("role", "master")
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

/** Подпись мастера для печати в акте. */
export async function getMasterSignature(id: string): Promise<string | null> {
  const { data, error } = await db()
    .from("profiles")
    .select("signature_image")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data?.signature_image ?? null;
}

export async function setMasterSignature(
  id: string,
  image: string | null,
): Promise<void> {
  const { error } = await db()
    .from("profiles")
    .update({ signature_image: image, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
