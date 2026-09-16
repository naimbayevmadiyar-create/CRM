"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Check, Clock, FileText, MapPin, MessageCircle, Pencil, Phone, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDateTime, formatPhone, phoneDigits } from "@/lib/format";
import { APPLIANCE_LABEL } from "@/lib/appliance";
import { masterButtonLabel, nextForMaster, STATUS_LABEL, type Status } from "@/lib/status";
import type { ApplianceKind, ExpensesPayer } from "@/types/db";
import {
  advance,
  finish,
  saveClient,
  saveProgress,
  type DraftReport,
  type FinishReport,
} from "./actions";
import type { DraftItem } from "./ItemsEditor";
import { clearDraft } from "./draft";
import { Skeleton } from "@/components/ui/Skeleton";

/*
  Форма отчёта рисуется только в браузере: она поднимает несохранённый
  черновик с телефона, а на сервере телефона нет. Отрисуй её сервер —
  значения разошлись бы при загрузке.
*/
const FinishForm = dynamic(() => import("./FinishForm").then((m) => m.FinishForm), {
  ssr: false,
  loading: () => <Skeleton className="mt-4 h-72 w-full" />,
});

export type MasterOrder = {
  id: string;
  number: number;
  client_name: string | null;
  client_phone: string;
  address: string | null;
  appliance: ApplianceKind;
  problem: string | null;
  status: Status;
  scheduled_at: string | null;
  total_amount: number | null;
  expenses: number;
  expenses_note: string | null;
  expenses_payer: ExpensesPayer;
};

export function OrderCard({
  order,
  items,
  sharePercent,
}: {
  order: MasterOrder;
  /** Уже сохранённый перечень работ. */
  items: DraftItem[];
  sharePercent: number;
}) {
  // оптимистичный этап: подпись кнопки меняется сразу, не дожидаясь сервера
  const [status, setStatus] = useOptimistic(order.status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // данные клиента мастер уточняет на месте: по телефону их записали со слов
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(order.client_name ?? "");
  const [address, setAddress] = useState(order.address ?? "");
  const [saved, setSaved] = useState(false);

  const label = masterButtonLabel(status);
  const askReport = nextForMaster(status) === "done";
  const digits = phoneDigits(order.client_phone);

  function onAdvance() {
    setError(null);
    startTransition(async () => {
      const next = nextForMaster(status);
      if (next) setStatus(next);
      const result = await advance(order.id);
      if (result.error) setError(result.error);
    });
  }

  function onFinish(report: FinishReport) {
    setError(null);
    startTransition(async () => {
      setStatus("done");
      const result = await finish(order.id, report);
      if (result.error) setError(result.error);
      else clearDraft(order.id);
    });
  }

  /** Сохраняет отчёт, не закрывая заявку. Возвращает текст ошибки или null. */
  async function onSaveDraft(draft: DraftReport): Promise<string | null> {
    setError(null);
    const result = await saveProgress(order.id, draft);
    return result.error ?? null;
  }

  function onSaveClient() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveClient(order.id, { clientName: name, address });
      if (result.error) setError(result.error);
      else {
        setSaved(true);
        setEditing(false);
      }
    });
  }

  return (
    <article className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {name || "Клиент"}{" "}
          <span className="font-normal text-muted">№{order.number}</span>
        </h2>
        <span className="shrink-0 text-sm text-muted" aria-live="polite">
          {STATUS_LABEL[status]}
        </span>
      </div>

      <p className="text-muted">{APPLIANCE_LABEL[order.appliance]}</p>

      {order.scheduled_at && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface2 px-2.5 py-1 text-sm">
          <Clock size={15} aria-hidden />
          {formatDateTime(order.scheduled_at)}
        </p>
      )}

      {address && <p className="mt-3 text-lg">{address}</p>}
      {order.problem && <p className="mt-1 text-muted">{order.problem}</p>}

      {editing ? (
        <div className="mt-3 space-y-2 rounded-[var(--radius-card)] border border-border p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ФИО клиента"
            aria-label="ФИО клиента"
            className="h-12 w-full rounded-[var(--radius-card)] border border-border
                       bg-surface px-3 outline-none focus:border-primary"
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Адрес"
            aria-label="Адрес клиента"
            className="h-12 w-full rounded-[var(--radius-card)] border border-border
                       bg-surface px-3 outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={onSaveClient} disabled={pending}>
              Сохранить
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary
                     underline underline-offset-4"
        >
          {saved ? <Check size={14} aria-hidden /> : <Pencil size={14} aria-hidden />}
          {saved ? "Данные сохранены" : "Уточнить ФИО и адрес"}
        </button>
      )}

      <div className="mt-4 flex gap-2">
        <a
          href={`tel:+${digits}`}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2
                     rounded-[var(--radius-card)] bg-surface2 font-medium"
        >
          <Phone size={18} aria-hidden />
          {formatPhone(order.client_phone)}
        </a>

        <a
          href={`https://wa.me/${digits}`}
          target="_blank"
          rel="noopener"
          aria-label="Написать клиенту в WhatsApp"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center
                     rounded-[var(--radius-card)] bg-surface2"
        >
          <MessageCircle size={18} aria-hidden />
        </a>

        {order.address && (
          <a
            href={`https://2gis.kz/astana/search/${encodeURIComponent(order.address)}`}
            target="_blank"
            rel="noopener"
            aria-label="Открыть адрес в 2ГИС"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center
                       rounded-[var(--radius-card)] bg-surface2"
          >
            <MapPin size={18} aria-hidden />
          </a>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/print/act/${order.id}`}
          target="_blank"
          className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-card)]
                     bg-surface2 px-3 text-sm font-medium text-muted"
        >
          <FileText size={14} aria-hidden />
          Акт
        </Link>
        <Link
          href={`/print/workorder/${order.id}`}
          target="_blank"
          className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-card)]
                     bg-surface2 px-3 text-sm font-medium text-muted"
        >
          <Printer size={14} aria-hidden />
          Заказ-наряд
        </Link>
      </div>

      {askReport ? (
        <FinishForm
          orderId={order.id}
          initial={{
            total: order.total_amount ?? 0,
            expenses: order.expenses,
            expensesNote: order.expenses_note ?? "",
            expensesPayer: order.expenses_payer,
            items,
          }}
          onSaveDraft={onSaveDraft}
          sharePercent={sharePercent}
          pending={pending}
          onSubmit={onFinish}
        />
      ) : label ? (
        <Button size="lg" className="mt-4 w-full" onClick={onAdvance} disabled={pending}>
          {label}
        </Button>
      ) : null}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </article>
  );
}
