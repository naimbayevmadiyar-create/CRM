"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDateTime, formatPhone, phoneDigits } from "@/lib/format";
import { APPLIANCE_LABEL } from "@/lib/appliance";
import { masterButtonLabel, nextForMaster, STATUS_LABEL, type Status } from "@/lib/status";
import type { ApplianceKind } from "@/types/db";
import { advance, finish, type FinishReport } from "./actions";
import { FinishForm } from "./FinishForm";

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
};

export function OrderCard({
  order,
  defaultSharePercent,
}: {
  order: MasterOrder;
  defaultSharePercent: number;
}) {
  // оптимистичный этап: подпись кнопки меняется сразу, не дожидаясь сервера
  const [status, setStatus] = useOptimistic(order.status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
    });
  }

  return (
    <article className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {order.client_name || "Клиент"}{" "}
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

      {order.address && <p className="mt-3 text-lg">{order.address}</p>}
      {order.problem && <p className="mt-1 text-muted">{order.problem}</p>}

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

      {askReport ? (
        <FinishForm
          defaultSharePercent={defaultSharePercent}
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
