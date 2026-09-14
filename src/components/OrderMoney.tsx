"use client";

import { formatTenge } from "@/lib/format";
import { calcSettlement, PAYMENT_LABEL, type PaymentMethod } from "@/lib/settlement";

/**
 * Деньги закрытого заказа в четыре клетки.
 *
 * Раньше сумма пряталась за стрелочкой, и директор не видел главного, пока
 * не ткнёт в каждую заявку. Теперь всё на виду сразу: сколько согласовали,
 * сколько ушло на запчасти, что осталось чистыми и сколько приходит в кассу.
 */
export function OrderMoney({
  total,
  expenses,
  paymentMethod,
  sharePercent,
}: {
  total: number;
  expenses: number;
  paymentMethod: PaymentMethod | null;
  sharePercent: number;
}) {
  const settlement = calcSettlement({
    total,
    expenses,
    sharePercent,
    paymentMethod: paymentMethod ?? "cash",
  });

  const cashLabel =
    paymentMethod == null
      ? "В кассу"
      : settlement.direction === "master_owes"
        ? `В кассу · ${PAYMENT_LABEL[paymentMethod].toLowerCase()}`
        : `Мастеру · ${PAYMENT_LABEL[paymentMethod].toLowerCase()}`;

  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Cell label="Согласовано" value={formatTenge(total)} />
      <Cell
        label="Расход"
        value={expenses > 0 ? `− ${formatTenge(expenses)}` : "—"}
        muted={expenses === 0}
      />
      <Cell label="Чистыми" value={formatTenge(settlement.net)} />
      <Cell label={cashLabel} value={formatTenge(settlement.amount)} strong />
    </dl>
  );
}

function Cell({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={
        "rounded-[var(--radius-card)] px-3 py-2 " +
        (strong ? "bg-primary/8" : "bg-surface2")
      }
    >
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={
          "mt-0.5 whitespace-nowrap text-[15px] " +
          (strong ? "font-semibold text-primary" : muted ? "text-muted" : "font-medium")
        }
      >
        {value}
      </dd>
    </div>
  );
}
