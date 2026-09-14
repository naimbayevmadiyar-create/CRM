"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { saveBuyer, type BuyerState } from "./actions";

const INITIAL: BuyerState = {};

type Row = { title: string; price: number; quantity: number };

export function BuyerForm({
  invoiceId,
  defaults,
  items,
}: {
  invoiceId: string;
  defaults: {
    buyer_name: string | null;
    buyer_bin: string | null;
    buyer_address: string | null;
    contract_number: string | null;
  };
  items: Row[];
}) {
  const action = saveBuyer.bind(null, invoiceId);
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [rows, setRows] = useState<Row[]>(
    items.length > 0 ? items : [{ title: "", price: 0, quantity: 1 }],
  );

  function patch(index: number, change: Partial<Row>) {
    setRows(rows.map((row, i) => (i === index ? { ...row, ...change } : row)));
  }

  return (
    <form
      action={formAction}
      className="no-print mx-auto mt-4 max-w-3xl rounded-[var(--radius-card)]
                 border border-border bg-surface p-5"
    >
      <h2 className="text-lg font-semibold">Реквизиты плательщика</h2>
      <p className="mb-4 mt-1 text-sm text-muted">
        Заполните и сохраните — данные подставятся в счёт и в АВР, печатать можно сразу.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Организация"
          name="buyer_name"
          defaultValue={defaults.buyer_name ?? ""}
          placeholder="ТОО «…» или ИП «…»"
          required
        />
        <Field
          label="БИН / ИИН"
          name="buyer_bin"
          inputMode="numeric"
          defaultValue={defaults.buyer_bin ?? ""}
        />
        <Field
          label="Юридический адрес"
          name="buyer_address"
          defaultValue={defaults.buyer_address ?? ""}
        />
        <Field
          label="Номер договора"
          name="contract_number"
          defaultValue={defaults.contract_number ?? ""}
          placeholder="Необязательно"
        />
      </div>

      <h3 className="mb-2 mt-6 font-medium">Что в счёте</h3>
      <ul className="space-y-2">
        {rows.map((row, index) => (
          <li key={index} className="flex flex-wrap items-center gap-2">
            <input
              name="item_title"
              value={row.title}
              onChange={(e) => patch(index, { title: e.target.value })}
              placeholder="Наименование услуги"
              aria-label="Наименование услуги"
              className="h-11 min-w-48 flex-1 rounded-[var(--radius-card)] border border-border
                         bg-surface px-3 outline-none focus:border-primary"
            />
            <input
              name="item_price"
              value={row.price || ""}
              onChange={(e) =>
                patch(index, { price: Number(e.target.value.replace(/\D/g, "")) || 0 })
              }
              inputMode="numeric"
              placeholder="цена"
              aria-label="Цена"
              className="h-11 w-28 rounded-[var(--radius-card)] border border-border
                         bg-surface px-3 text-right outline-none focus:border-primary"
            />
            <input
              name="item_quantity"
              value={row.quantity}
              onChange={(e) =>
                patch(index, {
                  quantity: Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1),
                })
              }
              inputMode="numeric"
              aria-label="Количество"
              className="h-11 w-16 rounded-[var(--radius-card)] border border-border
                         bg-surface px-3 text-center outline-none focus:border-primary"
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
                aria-label="Убрать строку"
                className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-card)] text-muted"
              >
                <X size={16} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setRows([...rows, { title: "", price: 0, quantity: 1 }])}
        className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4"
      >
        <Plus size={15} aria-hidden />
        Ещё строка
      </button>

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняем…" : "Сохранить"}
        </Button>
        {state.ok && <span className="text-sm text-success">Счёт обновлён</span>}
        {state.error && (
          <span role="alert" className="text-sm text-danger">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
