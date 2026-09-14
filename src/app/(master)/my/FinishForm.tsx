"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
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
  initial,
  onSaveDraft,
  sharePercent,
  pending,
  onSubmit,
}: {
  /** То, что мастер уже сохранил раньше. */
  initial: { total: number; expenses: number; expensesNote: string; items: DraftItem[] };
  onSaveDraft: (draft: {
    total: number;
    expenses: number;
    expensesNote: string;
    items: DraftItem[];
  }) => Promise<string | null>;
  /** Доля компании этого мастера. Меняет её только директор. */
  sharePercent: number;
  pending: boolean;
  onSubmit: (report: {
    total: number;
    expenses: number;
    expensesNote: string;
    paymentMethod: PaymentMethod;
    items: DraftItem[];
  }) => void;
}) {
  const [total, setTotal] = useState(initial.total ? String(initial.total) : "");
  const [expenses, setExpenses] = useState(initial.expenses ? String(initial.expenses) : "");
  const [note, setNote] = useState(initial.expensesNote);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [items, setItems] = useState<DraftItem[]>(initial.items);
  const [error, setError] = useState<string | null>(null);

  const [saving, startSaving] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  // что-то поменяли после сохранения — подсказку «Сохранено» убираем,
  // иначе человек уйдёт, думая, что всё записано
  const [dirty, setDirty] = useState(false);

  const totalValue = Number(total.replace(/\D/g, "")) || 0;
  const expensesValue = Number(expenses.replace(/\D/g, "")) || 0;

  const settlement = calcSettlement({
    total: totalValue,
    expenses: expensesValue,
    sharePercent,
    paymentMethod: payment ?? "cash",
  });

  const tooMuchExpenses = expensesValue > totalValue && totalValue > 0;

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
        items,
      });
      if (failure) {
        setError(failure);
        return;
      }
      setDirty(false);
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
      <ItemsEditor items={items} onChange={onItemsChange} />

      <Money
        label="Согласовано с клиентом"
        value={total}
        onChange={change(setTotal)}
      />

      <Money
        label="Запчасти (деньги компании)"
        value={expenses}
        onChange={change(setExpenses)}
      />

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

          {settlement.direction === "master_owes" && expensesValue > 0 && (
            <p className="mt-1 text-xs text-muted">
              Доля компании {formatTenge(settlement.companyCut)} плюс её же деньги
              за запчасти {formatTenge(expensesValue)}
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
