import type { Metadata } from "next";
import { getCompany, missingForInvoice } from "@/lib/db/company";
import { listRecentErrors } from "@/lib/db/errors";
import { SettingsView } from "./SettingsView";
import { ErrorLog } from "./ErrorLog";

export const metadata: Metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const [company, errors] = await Promise.all([getCompany(), listRecentErrors()]);

  return (
    <>
      <SettingsView company={company} invoiceGaps={missingForInvoice(company)} />
      <ErrorLog errors={errors} />
    </>
  );
}
