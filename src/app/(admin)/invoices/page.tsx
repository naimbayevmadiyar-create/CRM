import type { Metadata } from "next";
import {
  invoiceTotal,
  listInvoices,
  listItemsForInvoices,
} from "@/lib/db/invoices";
import { InvoicesView } from "./InvoicesView";

export const metadata: Metadata = { title: "Счета" };

export default async function InvoicesPage() {
  const invoices = await listInvoices();
  const items = await listItemsForInvoices(invoices.map((invoice) => invoice.id));

  const rows = invoices.map((invoice) => ({
    invoice,
    total: invoiceTotal(items.get(invoice.id) ?? []),
    what: (items.get(invoice.id) ?? []).map((item) => item.title).join(", "),
  }));

  return <InvoicesView rows={rows} />;
}
