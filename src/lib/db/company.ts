import "server-only";
import { db } from "@/lib/supabase";

/**
 * Реквизиты компании для печатных документов.
 *
 * Хранятся в базе, а не в коде: сменится банк, форма собственности или
 * телефон — правка в админке, без пересборки и деплоя.
 */
export type Company = {
  company_name: string;
  company_legal_name: string | null;
  company_bin: string | null;
  company_address: string | null;
  company_phone: string | null;
  bank_name: string | null;
  bank_bic: string | null;
  bank_account: string | null;
  diagnostics_price: number;
  warranty_months: number;
  repair_term_days: number;
  default_company_share_percent: number;
};

const COLUMNS = "company_name, company_legal_name, company_bin, company_address, company_phone, bank_name, bank_bic, bank_account, diagnostics_price, warranty_months, repair_term_days, default_company_share_percent";

export async function getCompany(): Promise<Company> {
  const { data, error } = await db()
    .from("app_settings")
    .select(COLUMNS)
    .eq("id", true)
    .single();

  if (error) throw error;
  return data as Company;
}

export async function updateCompany(patch: Partial<Company>): Promise<void> {
  const { error } = await db()
    .from("app_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (error) throw error;
}

/** Чего не хватает для счёта юрлицу. Пустой список — можно печатать. */
export function missingForInvoice(company: Company): string[] {
  const gaps: string[] = [];
  if (!company.company_legal_name) gaps.push("полное наименование");
  if (!company.company_bin) gaps.push("БИН");
  if (!company.bank_name) gaps.push("банк");
  if (!company.bank_account) gaps.push("счёт IBAN");
  if (!company.bank_bic) gaps.push("БИК");
  return gaps;
}
