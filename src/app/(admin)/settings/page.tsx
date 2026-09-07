import type { Metadata } from "next";
import { getCompany, missingForInvoice } from "@/lib/db/company";
import { SettingsView } from "./SettingsView";

export const metadata: Metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const company = await getCompany();
  return <SettingsView company={company} invoiceGaps={missingForInvoice(company)} />;
}
