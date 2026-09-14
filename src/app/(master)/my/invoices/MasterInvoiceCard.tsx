"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { formatDateTime, formatTenge } from "@/lib/format";
import { PAYMENT_LABEL } from "@/lib/settlement";
import { invoiceStatus, INVOICE_STATUS_LABEL, type Invoice } from "@/lib/invoice";
import { markInvoicePaidByMaster } from "../actions";

export function MasterInvoiceCard({
  invoice,
  total,
  what,
}: {
  invoice: Invoice;
  total: number;
  what: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const status = invoiceStatus(invoice);

  function mark(method: "transfer" | "cash") {
    setError(null);
    startTransition(async () => {
      const result = await markInvoicePaidByMaster(invoice.id, method);
      if (result.error) setError(result.error);
    });
  }

  return (
    <article className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-medium">Счёт №{invoice.number}</span>
        <span className="text-sm text-muted">{INVOICE_STATUS_LABEL[status]}</span>
        <span className="ml-auto font-semibold">{formatTenge(total)}</span>
      </div>

      <p className="mt-1 text-sm text-muted">
        {invoice.buyer_name || "плательщик не указан"}
        {what ? ` · ${what}` : ""}
      </p>

      {invoice.paid_marked_at ? (
        <p className="mt-2 text-sm text-muted">
          Оплата отмечена {formatDateTime(invoice.paid_marked_at)} ·{" "}
          {PAYMENT_LABEL[invoice.payment_method]}
          {invoice.confirmed_at ? " · подтверждена" : " · ждёт подтверждения"}
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button className="flex-1" onClick={() => mark("transfer")} disabled={pending}>
            Оплатили безналом
          </Button>
          <Button variant="ghost" onClick={() => mark("cash")} disabled={pending}>
            Наличными
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </article>
  );
}
