"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { formatTenge } from "@/lib/format";
import { PRICE_GROUPS, PRICE_LIST } from "@/lib/pricelist";

export type DraftItem = {
  title: string;
  price: number;
  quantity: number;
};

/**
 * Перечень выполненных работ.
 *
 * Нужен для заказ-наряда, который подписывает клиент. Заполнять необязательно:
 * не тронул — заказ всё равно закроется, а в документе будет одна строка
 * «Ремонт». Но если мастер отметил работы, сумма складывается сама и спорить
 * с клиентом становится не о чем.
 *
 * Выбор из прейскуранта, а не ввод текста: на телефоне тыкать быстрее,
 * чем печатать, и названия работ остаются одинаковыми во всех документах.
 */
export function ItemsEditor({
  items,
  onChange,
}: {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState("");

  function add() {
    const found = PRICE_LIST.find((item) => item.title === picked);
    if (!found) return;
    onChange([...items, { title: found.title, price: found.price, quantity: 1 }]);
    setPicked("");
  }

  function patch(index: number, change: Partial<DraftItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...change } : item)));
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!open && items.length === 0) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4"
      >
        <Plus size={15} aria-hidden />
        Отметить, что делали — для заказ-наряда
      </button>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-border p-3">
      <p className="mb-2 text-sm text-muted">Что делали</p>

      {items.length > 0 && (
        <ul className="mb-3 space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>

              <input
                value={item.price || ""}
                onChange={(e) =>
                  patch(index, { price: Number(e.target.value.replace(/\D/g, "")) || 0 })
                }
                inputMode="numeric"
                aria-label={`Цена: ${item.title}`}
                className="h-10 w-24 rounded-[var(--radius-card)] border border-border
                           bg-surface px-2 text-right outline-none focus:border-primary"
              />

              <input
                value={item.quantity}
                onChange={(e) =>
                  patch(index, {
                    quantity: Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1),
                  })
                }
                inputMode="numeric"
                aria-label={`Количество: ${item.title}`}
                className="h-10 w-12 rounded-[var(--radius-card)] border border-border
                           bg-surface px-2 text-center outline-none focus:border-primary"
              />

              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Убрать: ${item.title}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center
                           rounded-[var(--radius-card)] text-muted"
              >
                <X size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <select
          value={picked}
          onChange={(e) => setPicked(e.target.value)}
          aria-label="Выбрать работу из прейскуранта"
          className="h-11 min-w-0 flex-1 rounded-[var(--radius-card)] border border-border
                     bg-surface px-2 outline-none focus:border-primary"
        >
          <option value="">Выбрать работу…</option>
          {PRICE_GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {PRICE_LIST.filter((item) => item.group === group).map((item) => (
                <option key={item.title} value={item.title}>
                  {item.title} · {formatTenge(item.price)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <button
          type="button"
          onClick={add}
          disabled={!picked}
          className="h-11 shrink-0 rounded-[var(--radius-card)] bg-surface2 px-4
                     font-medium disabled:opacity-50"
        >
          Добавить
        </button>
      </div>

      {total > 0 && (
        <p className="mt-2 text-sm text-muted">
          По перечню: <b className="text-text">{formatTenge(total)}</b>
        </p>
      )}
    </div>
  );
}
