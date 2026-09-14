"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { updateCompany } from "@/lib/db/company";

export type SettingsState = { ok?: true; error?: string };

function text(form: FormData, key: string): string | null {
  const value = String(form.get(key) ?? "").trim();
  return value || null;
}

function number(form: FormData, key: string, fallback: number): number {
  const value = Number(String(form.get(key) ?? "").replace(/\D/g, ""));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Картинка из формы.
 *
 * Принимаем только data:image — строку, которую сделал браузер. Любую
 * ссылку наружу отвергаем: документ должен печататься и без интернета,
 * а чужой адрес в бланке — это чужой сервер в нашей бухгалтерии.
 */
function image(form: FormData, key: string): string | null {
  const value = String(form.get(key) ?? "").trim();
  if (!value) return null;
  if (!value.startsWith("data:image/")) return null;
  if (value.length > 500_000) return null;
  return value;
}

export async function saveSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  await requireAdmin();

  const name = String(formData.get("company_name") ?? "").trim();
  if (!name) return { error: "Название компании не может быть пустым" };

  const share = Number(String(formData.get("default_company_share_percent") ?? ""));
  if (!Number.isFinite(share) || share < 0 || share > 100) {
    return { error: "Доля компании должна быть числом от 0 до 100" };
  }

  const tax = Number(String(formData.get("tax_percent") ?? "").replace(",", "."));
  if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
    return { error: "Ставка налога должна быть числом от 0 до 100" };
  }

  try {
    await updateCompany({
      company_name: name,
      company_legal_name: text(formData, "company_legal_name"),
      company_bin: text(formData, "company_bin"),
      company_address: text(formData, "company_address"),
      company_phone: text(formData, "company_phone"),
      bank_name: text(formData, "bank_name"),
      bank_bic: text(formData, "bank_bic"),
      bank_account: text(formData, "bank_account"),
      diagnostics_price: number(formData, "diagnostics_price", 3000),
      warranty_months: number(formData, "warranty_months", 12),
      repair_term_days: number(formData, "repair_term_days", 45),
      default_company_share_percent: Math.round(share),
      bank_kbe: text(formData, "bank_kbe") ?? "17",
      payment_purpose_code: text(formData, "payment_purpose_code") ?? "859",
      contract_prefix: text(formData, "contract_prefix") ?? "000",
      tax_percent: tax,
      logo_image: image(formData, "logo_image"),
      stamp_image: image(formData, "stamp_image"),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось сохранить" };
  }

  revalidatePath("/settings");
  revalidatePath("/analytics");
  return { ok: true };
}
