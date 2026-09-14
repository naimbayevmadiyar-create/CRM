"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, FileSpreadsheet, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime, formatTenge } from "@/lib/format";
import { PAYMENT_LABEL } from "@/lib/settlement";
import {
  invoiceStatus,
  INVOICE_STATUS_LABEL,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/invoice";
import {
  cancelInvoiceAction,
  confirmInvoiceAction,
  markPaidAction,
  newInvoiceAction,
} from "./actions";

export type Row = { invoice: Invoice; total: number; what: string };

const TONE: Record<InvoiceStatus, string> = {
  issued: "bg-surface2 text-muted",
  awaiting: "bg-warning/12 text-warning",
  paid: "bg-success/12 text-success",
  canceled: "bg-surface2 text-muted line-through",
};

/**
 * Счета на оплату.
 *
 * Отдельный раздел, потому что счёт живёт своей жизнью: выставили сегодня,
 * оплатили через неделю, подтвердили ещё позже. В заявке этому места нет.
 */
export function InvoicesView({
  rows,
  showingCanceled,
}: {
  rows: Row[];
  showingCanceled: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const waiting = rows.filter((row) => invoiceStatus(row.invoice) === "awaiting").length;
  const unpaid = rows
    .filter((row) => ["issued", "awaiting"].includes(invoiceStatus(row.invoice)))
    .reduce((sum, row) => sum + row.total, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Счета на оплату</h1>
          <p className="mt-1 text-muted">
            Не оплачено на {formatTenge(unpaid)}
            {waiting > 0 && ` · ждут вашего подтверждения: ${waiting}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={showingCanceled ? "/invoices" : "/invoices?canceled=1"}
            className="text-sm text-muted underline underline-offset-4"
          >
            {showingCanceled ? "Скрыть отменённые" : "Показать отменённые"}
          </Link>

          <form action={() => startTransition(() => newInvoiceAction())}>
            <Button type="submit" disabled={pending}>
              <Plus size={16} aria-hidden />
              Новый счёт
            </Button>
          </form>
        </div>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          title="Счетов пока нет"
          hint="Выставьте первый — кнопкой выше или из заявки, где просят счёт."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <InvoiceRow key={row.invoice.id} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}

function InvoiceRow({ row }: { row: Row }) {
  const { invoice, total, what } = row;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = invoiceStatus(invoice);

  async function run(job: () => Promise<{ error?: string } | { ok: true }>) {
    setBusy(true);
    setError(null);
    const result = await job();
    if ("error" in result && result.error) setError(result.error);
    setBusy(false);
  }

  return (
    <li className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium">
          Счёт №{invoice.number} · {invoice.buyer_name || "плательщик не указан"}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TONE[status]}`}>
          {INVOICE_STATUS_LABEL[status]}
        </span>
        <span className="text-sm text-muted">{formatDateTime(invoice.created_at)}</span>
        <span className="ml-auto font-semibold">{formatTenge(total)}</span>
      </div>

      {what && <p className="mt-1 text-sm text-muted">{what}</p>}

      {invoice.paid_marked_at && (
        <p className="mt-1 text-sm text-muted">
          Отметили оплату {formatDateTime(invoice.paid_marked_at)} ·{" "}
          {PAYMENT_LABEL[invoice.payment_method]}
          {invoice.confirmed_at && ` · подтверждено ${formatDateTime(invoice.confirmed_at)}`}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DocLink href={`/print/invoice/${invoice.id}`}>
          <Receipt size={14} aria-hidden />
          Счёт
        </DocLink>
        <DocLink href={`/print/avr/${invoice.id}`}>
          <FileSpreadsheet size={14} aria-hidden />
          АВР
        </DocLink>
        {invoice.order_id && (
          <DocLink href={`/orders?q=${invoice.order_id}`}>Заявка</DocLink>
        )}

        {status === "issued" && (
          <button
            onClick={() => run(() => markPaidAction(invoice.id, "transfer"))}
            disabled={busy}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-[var(--radius-card)]
                       bg-surface2 px-4 text-sm font-medium disabled:opacity-60"
          >
            Отметить оплату
          </button>
        )}

        {status === "awaiting" && (
          <button
            onClick={() => run(() => confirmInvoiceAction(invoice.id))}
            disabled={busy}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-[var(--radius-card)]
                       bg-primary px-4 text-sm font-medium text-primaryink disabled:opacity-60"
          >
            <Check size={16} aria-hidden />
            Подтвердить оплату
          </button>
        )}

        {status !== "canceled" && status !== "paid" && (
          <button
            onClick={() => run(() => cancelInvoiceAction(invoice.id))}
            disabled={busy}
            className="text-sm text-muted underline underline-offset-4"
          >
            Отменить
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </li>
  );
}

function DocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      className="inline-flex items-center gap-1 rounded-[var(--radius-card)]
                 bg-surface2 px-2.5 py-1.5 text-xs font-medium text-muted
                 transition-colors hover:text-text"
    >
      {children}
    </Link>
  );
}
