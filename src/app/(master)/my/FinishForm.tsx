"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, History } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, formatTenge } from "@/lib/format";
import {
  calcSettlement,
  EXPENSES_PAYERS,
  PAYMENT_LABEL,
  PAYMENT_METHODS,
  type ExpensesPayer,
  type PaymentMethod,
} from "@/lib/settlement";
import { ItemsEditor, type DraftItem } from "./ItemsEditor";
import { clearDraft, readDraft, writeDraft } from "./draft";

/**
 * Отчёт по заявке.
 *
 * Кнопок две, и это принципиально. «Сохранить» — записать работы и суммы,
 * заявка остаётся открытой: ремонт бывает в несколько дней, деталь едет на
 * перепайку, а заказ-наряд клиенту нужен уже сейчас. «Закрыть заявку» —
 * работа сделана и оплачена. Раньше была одна «Готово», и сохранить,
 * не закрыв, было нельзя.
 *
 * Чистые, доли и итог считаются на лету — человек видит результат до того,
 * как нажмёт, и может поймать свою же опечатку.
 */
export function FinishForm({
  orderId,
  initial,
  onSaveDraft,
  sharePercent,
  pending,
  onSubmit,
}: {
  orderId: string;
  /** То, что мастер уже сохранил раньше. */
  initial: {
    total: number;
    expenses: number;
    expensesNote: string;
    expensesPayer: ExpensesPayer;
    items: DraftItem[];
  };
  onSaveDraft: (draft: {
    total: number;
    expenses: number;
    expensesNote: string;
    expensesPayer: ExpensesPayer;
    items: DraftItem[];
  }) => Promise<string | null>;
  /** Доля компании этого мастера. Меняет её только директор. */
  sharePercent: number;
  pending: boolean;
  onSubmit: (report: {
    total: number;
    expenses: number;
    expensesNote: string;
    expensesPayer: ExpensesPayer;
    paymentMethod: PaymentMethod;
    items: DraftItem[];
  }) => void;
}) {
  // Форма рисуется только в браузере (см. OrderCard), поэтому черновик можно
  // прочитать сразу при создании — без мигания и без расхождения с сервером.
  const [restored] = useState(() => readDraft(orderId));
  const start = restored ?? initial;

  const [total, setTotal] = useState(start.total ? String(start.total) : "");
  const [expenses, setExpenses] = useState(start.expenses ? String(start.expenses) : "");
  const [note, setNote] = useState(start.expensesNote);
  const [payer, setPayer] = useState<ExpensesPayer>(start.expensesPayer);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [items, setItems] = useState<DraftItem[]>(start.items);
  const [error, setError] = useState<string | null>(null);

  const [saving, startSaving] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  // что-то поменяли после сохранения — подсказку «Сохранено» убираем,
  // иначе человек уйдёт, думая, что всё записано
  // восстановленный черновик — это несохранённые правки
  const [dirty, setDirty] = useState(Boolean(restored));

  const totalValue = Number(total.replace(/\D/g, "")) || 0;
  const expensesValue = Number(expenses.replace(/\D/g, "")) || 0;

  const settlement = calcSettlement({
    total: totalValue,
    expenses: expensesValue,
    expensesPayer: payer,
    sharePercent,
    paymentMethod: payment ?? "cash",
  });

  const tooMuchExpenses = expensesValue > totalValue && totalValue > 0;

  // Пока есть несохранённые правки, держим их копию на телефоне
  useEffect(() => {
    if (!dirty) return;
    writeDraft(orderId, {
      total: totalValue,
      expenses: expensesValue,
      expensesNote: note,
      expensesPayer: payer,
      items,
    });
  }, [dirty, orderId, totalValue, expensesValue, note, payer, items]);

  function change<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setDirty(true);
    };
  }

  function save() {
    if (tooMuchExpenses) {
      setError("Запчасти дороже согласованной суммы — проверьте цифры");
      return;
    }
    setError(null);
    startSaving(async () => {
      const failure = await onSaveDraft({
        total: totalValue,
        expenses: expensesValue,
        expensesNote: note,
        expensesPayer: payer,
        items,
      });
      if (failure) {
        setError(failure);
        return;
      }
      setDirty(false);
      clearDraft(orderId);
      setSavedAt(
        new Intl.DateTimeFormat("ru-RU", {
          timeZone: "Asia/Almaty",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()),
      );
    });
  }

  function submit() {
    if (!totalValue) {
      setError("Впишите, на какую сумму договорились");
      return;
    }
    if (tooMuchExpenses) {
      setError("Запчасти дороже согласованной суммы — проверьте цифры");
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
      expensesPayer: payer,
      paymentMethod: payment,
      items,
    });
  }

  /** Отметил работы — сумма складывается сама, но её ещё можно поправить. */
  function onItemsChange(next: DraftItem[]) {
    setItems(next);
    setDirty(true);
    const sum = next.reduce((acc, item) => acc + item.price * item.quantity, 0);
    if (sum > 0) setTotal(String(sum));
  }

  return (
    <div className="mt-4 space-y-4">
      {restored && dirty && (
        <p className="flex items-start gap-2 rounded-[var(--radius-card)] bg-warning/10 p-3 text-sm">
          <History size={16} aria-hidden className="mt-0.5 shrink-0 text-warning" />
          Вернули то, что вы вписали, но не успели сохранить. Проверьте и нажмите
          «Сохранить».
        </p>
      )}

      <ItemsEditor items={items} onChange={onItemsChange} />

      <Money
        label="Согласовано с клиентом"
        value={total}
        onChange={change(setTotal)}
      />

      <Money label="Запчасти" value={expenses} onChange={change(setExpenses)} />

      {/* Чьи это были деньги — от этого зависит расчёт: свои мастеру вернут,
          деньги компании он возвращает вместе с её долей. */}
      {expensesValue > 0 && (
        <div>
          <p className="mb-1.5 text-sm text-muted">Запчасти оплатил</p>
          <div className="grid grid-cols-2 gap-2">
            {EXPENSES_PAYERS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => change(setPayer)(option)}
                aria-pressed={payer === option}
                className={cn(
                  "h-14 rounded-[var(--radius-card)] border text-base font-medium transition-colors",
                  payer === option
                    ? "border-primary bg-primary text-primaryink"
                    : "border-border bg-surface text-text",
                )}
              >
                {option === "company" ? "Компания" : "Я сам"}
              </button>
            ))}
          </div>
        </div>
      )}

      {expensesValue > 0 && (
        <input
          value={note}
          onChange={(e) => change(setNote)(e.target.value)}
          placeholder="На какие запчасти"
          aria-label="На какие запчасти ушли деньги"
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
          <Row label="Ваш заработок" value={formatTenge(settlement.masterCut)} />
          <Row
            label={`Доля компании · ${settlement.sharePercent}%`}
            value={formatTenge(settlement.companyCut)}
          />

          <div className="mt-2 border-t border-border pt-2">
            <Row
              label={
                settlement.direction === "master_owes"
                  ? "Внести в кассу"
                  : "Компания переведёт вам"
              }
              value={formatTenge(settlement.amount)}
              strong
            />
          </div>

          {settlement.reimbursement > 0 && (
            <Row
              label="Возврат за запчасти"
              value={formatTenge(settlement.reimbursement)}
            />
          )}

          {settlement.direction === "master_owes" && expensesValue > 0 && (
            <p className="mt-1 text-xs text-muted">
              {payer === "company"
                ? `Доля компании ${formatTenge(settlement.companyCut)} плюс её же деньги за запчасти ${formatTenge(expensesValue)}`
                : `Запчасти вы оплатили сами — эти деньги остаются у вас`}
            </p>
          )}
        </dl>
      )}

      {tooMuchExpenses && (
        <p role="alert" className="text-sm text-danger">
          Запчасти дороже согласованной суммы — проверьте цифры
        </p>
      )}

      <div className="space-y-2">
        <Button
          size="lg"
          variant="ghost"
          className="w-full"
          onClick={save}
          disabled={saving || pending}
        >
          {saving ? "Сохраняем…" : "Сохранить, заявка останется открытой"}
        </Button>

        {savedAt && !dirty && (
          <p className="flex items-center justify-center gap-1.5 text-sm text-success">
            <Check size={15} aria-hidden />
            Сохранено в {savedAt} — заказ-наряд уже можно печатать
          </p>
        )}

        <Button size="lg" className="w-full" onClick={submit} disabled={pending || saving}>
          Работа сделана — закрыть заявку
        </Button>
      </div>

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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
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
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-muted">{label}</dt>
      <dd className={strong ? "text-xl font-semibold" : "font-medium"}>{value}</dd>
    </div>
  );
}
