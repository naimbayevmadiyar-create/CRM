"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn, formatTenge } from "@/lib/format";
import {
  calcSettlement,
  PAYMENT_LABEL,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/lib/settlement";
import { ItemsEditor, type DraftItem } from "./ItemsEditor";

/**
 * Отчёт по закрытому заказу.
 *
 * Мастер вводит два числа и жмёт две кнопки. Чистые, доли и итог считаются
 * на лету и показываются тут же — человек видит результат до того, как
 * нажмёт «Готово», и может поймать свою же опечатку.
 */
export function FinishForm({
  defaultSharePercent,
  pending,
  onSubmit,
}: {
  defaultSharePercent: number;
  pending: boolean;
  onSubmit: (report: {
    total: number;
    expenses: number;
    expensesNote: string;
    paymentMethod: PaymentMethod;
    sharePercent: number;
    items: DraftItem[];
  }) => void;
}) {
  const [total, setTotal] = useState("");
  const [expenses, setExpenses] = useState("");
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [sharePercent, setSharePercent] = useState(defaultSharePercent);
  const [shareOpen, setShareOpen] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const totalValue = Number(total.replace(/\D/g, "")) || 0;
  const expensesValue = Number(expenses.replace(/\D/g, "")) || 0;

  const settlement = calcSettlement({
    total: totalValue,
    expenses: expensesValue,
    sharePercent,
    paymentMethod: payment ?? "cash",
  });

  const tooMuchExpenses = expensesValue > totalValue && totalValue > 0;

  function submit() {
    if (!totalValue) {
      setError("Впишите, на какую сумму договорились");
      return;
    }
    if (tooMuchExpenses) {
      setError("Расход больше согласованной суммы — проверьте цифры");
      return;
    }
    if (!payment) {
      setError("Отметьте, как заплатили");
      return;
    }
    setError(null);
    onSubmit({
      total: totalValue,
      expenses: expensesValue,
      expensesNote: note,
      paymentMethod: payment,
      sharePercent,
      items,
    });
  }

  /** Отметил работы — сумма складывается сама, но её ещё можно поправить. */
  function onItemsChange(next: DraftItem[]) {
    setItems(next);
    const sum = next.reduce((acc, item) => acc + item.price * item.quantity, 0);
    if (sum > 0) setTotal(String(sum));
  }

  return (
    <div className="mt-4 space-y-4">
      <ItemsEditor items={items} onChange={onItemsChange} />

      <Money
        label="Согласовано с клиентом"
        value={total}
        onChange={setTotal}
        autoFocus
      />

      <Money label="Расход на запчасти" value={expenses} onChange={setExpenses} />

      {expensesValue > 0 && (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="На что потратили"
          aria-label="На что был расход"
          className="h-12 w-full rounded-[var(--radius-card)] border border-border
                     bg-surface px-4 outline-none focus:border-primary"
        />
      )}

      <div>
        <p className="mb-1.5 text-sm text-muted">Как заплатили</p>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPayment(method)}
              aria-pressed={payment === method}
              className={cn(
                "h-14 rounded-[var(--radius-card)] border text-lg font-medium transition-colors",
                payment === method
                  ? "border-primary bg-primary text-primaryink"
                  : "border-border bg-surface text-text",
              )}
            >
              {PAYMENT_LABEL[method]}
            </button>
          ))}
        </div>
      </div>

      {totalValue > 0 && (
        <dl className="rounded-[var(--radius-card)] bg-surface2 p-4 text-[15px]">
          <Row label="Чистыми" value={formatTenge(settlement.net)} />
          <Row
            label={`Доля компании · ${settlement.sharePercent}%`}
            value={formatTenge(settlement.companyCut)}
            action={
              <button
                type="button"
                onClick={() => setShareOpen((v) => !v)}
                className="text-sm text-primary underline underline-offset-4"
              >
                изменить
              </button>
            }
          />

          {shareOpen && (
            <div className="my-2 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={sharePercent}
                onChange={(e) => setSharePercent(Number(e.target.value))}
                aria-label="Доля компании в процентах"
                className="h-11 w-24 rounded-[var(--radius-card)] border border-border
                           bg-surface px-3 outline-none focus:border-primary"
              />
              <span className="text-sm text-muted">
                процентов от чистых — только для этого заказа
              </span>
            </div>
          )}

          <div className="mt-2 border-t border-border pt-2">
            <Row
              label={
                settlement.direction === "master_owes"
                  ? "Внести в кассу"
                  : "Компания вернёт вам"
              }
              value={formatTenge(settlement.amount)}
              strong
            />
          </div>

          {settlement.direction === "company_owes" && expensesValue > 0 && (
            <p className="mt-1 text-xs text-muted">
              Ваша доля {formatTenge(settlement.masterCut)} плюс запчасти{" "}
              {formatTenge(expensesValue)}
            </p>
          )}
        </dl>
      )}

      {tooMuchExpenses && (
        <p role="alert" className="text-sm text-danger">
          Расход больше согласованной суммы — проверьте цифры
        </p>
      )}

      <Button size="lg" className="w-full" onClick={submit} disabled={pending}>
        Готово
      </Button>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Money({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          enterKeyHint="next"
          autoFocus={autoFocus}
          placeholder="0"
          className="h-14 w-full rounded-[var(--radius-card)] border border-border
                     bg-surface px-4 pr-10 text-2xl outline-none focus:border-primary"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xl text-muted">
          ₸
        </span>
      </div>
    </label>
  );
}

function Row({
  label,
  value,
  strong,
  action,
}: {
  label: string;
  value: string;
  strong?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="flex items-baseline gap-2 text-muted">
        {label}
        {action}
      </dt>
      <dd className={strong ? "text-xl font-semibold" : "font-medium"}>{value}</dd>
    </div>
  );
}
