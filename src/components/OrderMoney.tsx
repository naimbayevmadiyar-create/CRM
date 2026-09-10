"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn, formatTenge } from "@/lib/format";
import { calcSettlement, PAYMENT_LABEL, type PaymentMethod } from "@/lib/settlement";

/**
 * Раскладка по деньгам закрытого заказа.
 *
 * Свёрнута до одной строки с общей суммой: в списке из тридцати заявок
 * подробности мешают. Раскрывается по нажатию — тогда видно, на что был
 * расход и сколько ушло в кассу.
 */
export function OrderMoney({
  total,
  expenses,
  expensesNote,
  paymentMethod,
  sharePercent,
}: {
  total: number;
  expenses: number;
  expensesNote: string | null;
  paymentMethod: PaymentMethod | null;
  sharePercent: number;
}) {
  const [open, setOpen] = useState(false);

  const settlement = calcSettlement({
    total,
    expenses,
    sharePercent,
    paymentMethod: paymentMethod ?? "cash",
  });

  const hasDetails = expenses > 0 || paymentMethod !== null;

  if (!hasDetails) {
    return <span className="font-medium">{formatTenge(total)}</span>;
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 font-medium"
      >
        {formatTenge(total)}
        <ChevronDown
          size={15}
          aria-hidden
          className={cn("text-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <dl className="mt-2 rounded-[var(--radius-card)] bg-surface2 p-3 text-sm">
          <Row label="Согласовано" value={formatTenge(total)} />

          {expenses > 0 && (
            <Row
              label={expensesNote ? `Расход · ${expensesNote}` : "Расход на запчасти"}
              value={`− ${formatTenge(expenses)}`}
            />
          )}

          <Row label="Чистыми" value={formatTenge(settlement.net)} />
          <Row
            label={`Доля компании · ${settlement.sharePercent}%`}
            value={formatTenge(settlement.companyCut)}
            strong
          />

          {paymentMethod && (
            <div className="mt-2 border-t border-border pt-2">
              <Row
                label={
                  settlement.direction === "master_owes"
                    ? `${PAYMENT_LABEL[paymentMethod]} · мастер вносит`
                    : `${PAYMENT_LABEL[paymentMethod]} · вернуть мастеру`
                }
                value={formatTenge(settlement.amount)}
              />
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <dt className="text-muted">{label}</dt>
      <dd className={strong ? "font-semibold" : ""}>{value}</dd>
    </div>
  );
}
