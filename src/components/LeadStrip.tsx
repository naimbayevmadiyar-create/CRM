"use client";

import { MessageCircle, Phone } from "lucide-react";
import { formatWhen } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/source";
import type { Lead } from "@/lib/db/leads";

/**
 * Необработанное обращение: человек кликнул на сайте, но заявки ещё нет.
 * Диспетчер видит, когда и откуда пришли, и одной кнопкой заводит заявку
 * с уже проставленным источником.
 */
export function LeadStrip({
  lead,
  onCreate,
}: {
  lead: Lead;
  onCreate: (lead: Lead) => void;
}) {
  const Icon = lead.channel === "whatsapp" ? MessageCircle : Phone;

  return (
    <li
      className="flex items-center gap-3 rounded-[var(--radius-card)] border border-border
                 bg-surface px-4 py-3"
    >
      <Icon size={18} className="shrink-0 text-muted" aria-hidden />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {lead.channel === "whatsapp" ? "Клик по WhatsApp" : "Клик по телефону"}
        </p>
        <p className="truncate text-sm text-muted">
          {SOURCE_LABEL[lead.source]}
          {lead.page_anchor ? ` · экран ${lead.page_anchor}` : ""} · {formatWhen(lead.created_at)}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onCreate(lead)}
        className="shrink-0 rounded-[var(--radius-card)] bg-primary px-3.5 py-2
                   text-sm font-medium text-primaryink active:scale-[0.98]"
      >
        Создать заявку
      </button>
    </li>
  );
}
