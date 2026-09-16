"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextArea } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatTenge } from "@/lib/format";
import { shortDateRu } from "@/lib/docs";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABEL,
  type ExpenseCategory,
} from "@/lib/expenseCategory";
import type { Expense } from "@/lib/db/expenses";
import { createExpense, removeExpense, type ExpenseFormState } from "./actions";

const INITIAL: ExpenseFormState = {};

const PERIODS = [7, 30, 90];

/**
 * Расходы компании.
 *
 * Отдельный раздел, потому что это другие деньги, чем запчасти в заказе:
 * реклама, аренда и всё, что выписывается руками. Из них и считается
 * чистая прибыль, а значит и доля партнёра.
 */
export function ExpensesView({
  expenses,
  days,
  today,
  total,
  byCategory,
}: {
  expenses: Expense[];
  days: number;
  today: string;
  total: number;
  byCategory: [ExpenseCategory, number][];
}) {
  const [state, action, pending] = useActionState(createExpense, INITIAL);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Расходы</h1>
          <p className="mt-1 text-muted">
            За период потрачено <b className="text-text">{formatTenge(total)}</b>
          </p>
        </div>

        <nav className="flex gap-1" aria-label="Период">
          {PERIODS.map((span) => (
            <Link
              key={span}
              href={`/expenses?days=${span}`}
              aria-current={span === days ? "page" : undefined}
              className={
                "rounded-[var(--radius-card)] px-3 py-1.5 text-sm font-medium transition-colors " +
                (span === days
                  ? "bg-primary text-primaryink"
                  : "bg-surface2 text-muted hover:text-text")
              }
            >
              {span} дней
            </Link>
          ))}
        </nav>
      </header>

      {byCategory.length > 0 && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {EXPENSE_CATEGORIES.map((category) => {
            const sum = byCategory.find(([key]) => key === category)?.[1] ?? 0;
            return (
              <div
                key={category}
                className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
              >
                <p className="text-sm text-muted">{EXPENSE_CATEGORY_LABEL[category]}</p>
                <p className={"mt-1 text-xl font-semibold " + (sum === 0 ? "text-muted" : "")}>
                  {formatTenge(sum)}
                </p>
              </div>
            );
          })}
        </section>
      )}

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">Записать расход</h2>
        <form action={action} className="grid gap-4 sm:grid-cols-4">
          <Field label="Дата" name="spent_on" type="date" defaultValue={today} required />
          <Select label="На что" name="category" defaultValue="marketing">
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {EXPENSE_CATEGORY_LABEL[category]}
              </option>
            ))}
          </Select>
          <Field label="Сумма, ₸" name="amount" inputMode="numeric" placeholder="90000" required />
          <div className="self-end">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Пишем…" : "Записать"}
            </Button>
          </div>
          <div className="sm:col-span-4">
            <TextArea
              label="Комментарий"
              name="note"
              placeholder="Например: Google Ads за 15 сентября, 33 целевых звонка"
            />
          </div>
          {state.error && (
            <p role="alert" className="text-sm text-danger sm:col-span-4">
              {state.error}
            </p>
          )}
        </form>
      </section>

      {expenses.length === 0 ? (
        <EmptyState
          title="Расходов за период нет"
          hint="Запишите рекламу и аренду — тогда в аналитике будет настоящая чистая прибыль."
        />
      ) : (
        <ul className="space-y-2">
          {expenses.map((expense) => (
            <ExpenseRow key={expense.id} expense={expense} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ExpenseRow({ expense }: { expense: Expense }) {
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (gone) return null;

  async function onDelete() {
    setBusy(true);
    const result = await removeExpense(expense.id);
    if ("error" in result && result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setGone(true);
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-card)]
                   border border-border bg-surface px-4 py-3">
      <span className="w-24 shrink-0 text-sm text-muted">{shortDateRu(expense.spent_on)}</span>
      <span className="font-medium">{EXPENSE_CATEGORY_LABEL[expense.category]}</span>
      {expense.note && <span className="text-sm text-muted">{expense.note}</span>}
      <span className="ml-auto font-semibold">{formatTenge(expense.amount)}</span>

      {asking ? (
        <span className="flex items-center gap-2 text-sm">
          <span className="text-muted">Удалить?</span>
          <button
            onClick={onDelete}
            disabled={busy}
            className="font-medium text-danger underline underline-offset-4"
          >
            Да
          </button>
          <button
            onClick={() => setAsking(false)}
            className="text-muted underline underline-offset-4"
          >
            Нет
          </button>
        </span>
      ) : (
        <button
          onClick={() => setAsking(true)}
          aria-label="Удалить расход"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-card)] text-muted"
        >
          <Trash2 size={16} aria-hidden />
        </button>
      )}

      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
    </li>
  );
}
