import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireMaster } from "@/lib/auth";
import {
  invoiceTotal,
  listInvoicesForMaster,
  listItemsForInvoices,
} from "@/lib/db/invoices";
import { EmptyState } from "@/components/ui/EmptyState";
import { MasterInvoiceCard } from "./MasterInvoiceCard";

export const metadata: Metadata = { title: "Счета" };

/**
 * Счета по заявкам мастера.
 *
 * Организации платят переводом и часто пишут об этом мастеру, а не в офис.
 * Здесь он ставит отметку — директор потом подтверждает поступление.
 */
export default async function MasterInvoicesPage() {
  const session = await requireMaster();
  const invoices = await listInvoicesForMaster(session.masterId);
  const items = await listItemsForInvoices(invoices.map((invoice) => invoice.id));

  return (
    <main className="safe-x mx-auto max-w-lg space-y-4 p-4">
      <header className="safe-top flex items-center gap-3 px-1 pt-2">
        <Link
          href="/my"
          aria-label="Назад к заявкам"
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] bg-surface2"
        >
          <ArrowLeft size={18} aria-hidden />
        </Link>
        <h1 className="text-2xl font-semibold">Счета</h1>
      </header>

      {invoices.length === 0 ? (
        <EmptyState
          title="Счетов по вашим заявкам нет"
          hint="Появится счёт для организации — он будет здесь, и вы отметите оплату."
        />
      ) : (
        <ul className="safe-bottom space-y-3">
          {invoices.map((invoice) => (
            <li key={invoice.id}>
              <MasterInvoiceCard
                invoice={invoice}
                total={invoiceTotal(items.get(invoice.id) ?? [])}
                what={(items.get(invoice.id) ?? []).map((item) => item.title).join(", ")}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
