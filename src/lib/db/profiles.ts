import "server-only";
import { db } from "@/lib/supabase";
import type { UserRole } from "@/types/db";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
};

const COLUMNS = "id, full_name, phone, role, is_active";

/** Мастера для экрана «Кто ты?» и для назначения на заявку. */
export async function listMasters(onlyActive = true): Promise<Profile[]> {
  let query = db()
    .from("profiles")
    .select(COLUMNS)
    .eq("role", "master")
    .order("full_name");

  if (onlyActive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw error;
  return data as Profile[];
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await db()
    .from("profiles")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Profile) ?? null;
}

export async function createMaster(input: {
  full_name: string;
  phone?: string;
}): Promise<void> {
  const { error } = await db().from("profiles").insert({
    full_name: input.full_name,
    phone: input.phone ?? null,
    role: "master",
  });
  if (error) throw error;
}

/** Отключённый мастер пропадает из выбора имени и из назначения. */
export async function setMasterActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await db().from("profiles").update({ is_active }).eq("id", id);
  if (error) throw error;
}
