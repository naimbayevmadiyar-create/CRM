"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { formatTenge } from "@/lib/format";
import { cleanupAction, previewAction, type CleanupState } from "./actions";

const INITIAL: CleanupState = {};

/**
 * Очистка данных за период.
 *
 * Два шага намеренно: сначала «Показать» — сколько заявок, обращений и денег
 * уйдёт, и только потом удаление со словом подтверждения. Удалённое не
 * вернуть, поэтому человек должен сначала увидеть цифры.
 */
export function CleanupView({ today }: { today: string }) {
  const [preview, previewSubmit, checking] = useActionState(previewAction, INITIAL);
  const [result, cleanupSubmit, removing] = useActionState(cleanupAction, INITIAL);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState(today);

  const found = preview.preview;
  const ready = found && found.from === from && found.to === to;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Очистка данных</h1>
        <p className="mt-1 text-muted">
          Удаляет заявки, обращения и расходы за выбранные дни. Мастера, пароли,
          реквизиты компании, логотип и печать остаются на месте.
        </p>
      </header>

      <p className="flex items-start gap-2 rounded-[var(--radius-card)] border border-danger/40
                    bg-danger/5 p-4 text-sm">
        <AlertTriangle size={18} aria-hidden className="mt-0.5 shrink-0 text-danger" />
        <span>
          Удалённое не восстановить. Вместе с заявкой уходят её работы, история,
          документы и счета по ней. Если в периоде есть настоящие заявки, по которым
          клиентам выданы акты, — удалять их не стоит:{" "}
          <Link href="/orders?status=all" className="underline underline-offset-4">
            проверьте список
          </Link>{" "}
          перед очисткой.
        </span>
      </p>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">1. Какой период</h2>
        <form action={previewSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field
            label="С какого дня"
            name="from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
          />
          <Field
            label="По какой день включительно"
            name="to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
          />
          <Button type="submit" variant="ghost" disabled={checking}>
            {checking ? "Считаем…" : "Показать, что удалится"}
          </Button>
          {preview.error && (
            <p role="alert" className="text-sm text-danger sm:col-span-3">
              {preview.error}
            </p>
          )}
        </form>

        {ready && (
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <Tile
              label="Заявок"
              value={String(found.orders)}
              hint={`на ${formatTenge(found.turnover)}`}
            />
            <Tile label="Обращений" value={String(found.leads)} />
            <Tile
              label="Расходов"
              value={String(found.expenses)}
              hint={`на ${formatTenge(found.expensesAmount)}`}
            />
            {found.invoices > 0 && (
              <Tile label="Счетов по этим заявкам" value={String(found.invoices)} />
            )}
            {found.confirmed > 0 && (
              <div className="rounded-[var(--radius-card)] border border-warning/40 bg-warning/5 p-4 sm:col-span-3">
                <p className="text-sm">
                  Из них <b>{found.confirmed}</b> — закрытые заявки, по которым деньги
                  уже приняты. Это настоящая работа, а не проба. Точно удалять?
                </p>
              </div>
            )}
          </dl>
        )}
      </section>

      {ready && (found.orders > 0 || found.leads > 0 || found.expenses > 0) && (
        <section className="rounded-[var(--radius-card)] border border-danger/40 bg-surface p-5">
          <h2 className="mb-4 text-lg font-semibold">2. Что удалить</h2>

          <form action={cleanupSubmit} className="space-y-4">
            <input type="hidden" name="from" value={from} />
            <input type="hidden" name="to" value={to} />

            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                name="orders"
                defaultChecked
                className="h-5 w-5 accent-[var(--primary)]"
              />
              <span>Заявки со всеми документами и счетами — {found.orders}</span>
            </label>

            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                name="leads"
                defaultChecked
                className="h-5 w-5 accent-[var(--primary)]"
              />
              <span>Обращения с сайта — {found.leads}</span>
            </label>

            <label className="flex items-center gap-2.5">
              <input type="checkbox" name="expenses" className="h-5 w-5 accent-[var(--primary)]" />
              <span>Расходы компании — {found.expenses}</span>
            </label>

            <div className="flex flex-wrap items-end gap-3 pt-2">
              <Field
                label="Впишите слово УДАЛИТЬ"
                name="confirm"
                autoComplete="off"
                placeholder="УДАЛИТЬ"
                className="w-56"
              />
              <Button type="submit" variant="danger" disabled={removing}>
                {removing ? "Удаляем…" : "Удалить навсегда"}
              </Button>
            </div>

            {result.error && (
              <p role="alert" className="text-sm text-danger">
                {result.error}
              </p>
            )}
          </form>
        </section>
      )}

      {result.removed && (
        <p className="flex items-start gap-2 rounded-[var(--radius-card)] border border-success/40
                      bg-success/5 p-4 text-sm">
          <Check size={18} aria-hidden className="mt-0.5 shrink-0 text-success" />
          <span>
            Удалено: заявок {result.removed.orders}, счетов {result.removed.invoices},
            обращений {result.removed.leads}, расходов {result.removed.expenses}.
            Аналитика уже пересчитана.
          </span>
        </p>
      )}
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface2 p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
