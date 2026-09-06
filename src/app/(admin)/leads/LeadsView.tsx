"use client";

import { useMemo } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { LeadStrip } from "@/components/LeadStrip";
import { SOURCE_LABEL, SOURCES } from "@/lib/source";
import type { Lead } from "@/lib/db/leads";

export function LeadsView({ leads }: { leads: Lead[] }) {
  // сводка по источникам за то же окно, что и список — чтобы было видно,
  // какой канал вообще шевелится
  const bySource = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of leads) {
      counts.set(lead.source, (counts.get(lead.source) ?? 0) + 1);
    }
    return SOURCES.filter((s) => counts.has(s)).map((s) => ({
      source: s,
      count: counts.get(s) ?? 0,
    }));
  }, [leads]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Обращения</h1>
        <p className="mt-1 text-muted">
          Клики по WhatsApp и телефону на сайте. Заявкой становятся после разговора.
        </p>
      </header>

      {bySource.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {bySource.map(({ source, count }) => (
            <li
              key={source}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm"
            >
              {SOURCE_LABEL[source]} · <span className="font-medium">{count}</span>
            </li>
          ))}
        </ul>
      )}

      {leads.length === 0 ? (
        <EmptyState
          title="Необработанных обращений нет"
          hint="Значит, все клики с сайта уже превращены в заявки."
        />
      ) : (
        <ul className="space-y-2">
          {leads.map((lead) => (
            <LeadStrip
              key={lead.id}
              lead={lead}
              onCreate={() => {
                // заводить заявку удобнее на экране заявок: там сразу список мастеров
                window.location.href = "/orders";
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
