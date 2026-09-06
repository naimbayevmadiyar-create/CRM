"use client";

import { useActionState, useState } from "react";
import { StatusPill } from "@/components/ui/StatusPill";
import { LeadStrip } from "@/components/LeadStrip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextArea } from "@/components/ui/Field";
import { formatPhone, formatTenge, formatWhen } from "@/lib/format";
import { APPLIANCES, APPLIANCE_LABEL } from "@/lib/appliance";
import { SOURCE_LABEL } from "@/lib/source";
import { STATUS_LABEL, type Status } from "@/lib/status";
import type { Order } from "@/lib/db/orders";
import type { Lead } from "@/lib/db/leads";
import type { Profile } from "@/lib/db/profiles";
import { assignAction, createOrderAction, type OrderFormState } from "./actions";

const INITIAL: OrderFormState = {};

const GROUPS: Status[] = ["new", "assigned", "on_the_way", "in_progress", "done", "canceled"];

export function OrdersView({
  orders,
  masters,
  leads,
}: {
  orders: Order[];
  masters: Profile[];
  leads: Lead[];
}) {
  const [state, action, pending] = useActionState(createOrderAction, INITIAL);
  const [formOpen, setFormOpen] = useState(false);
  const [fromLead, setFromLead] = useState<Lead | null>(null);

  function openFromLead(lead: Lead) {
    setFromLead(lead);
    setFormOpen(true);
  }

  function openBlank() {
    setFromLead(null);
    setFormOpen(true);
  }

  const grouped = GROUPS.map((status) => ({
    status,
    items: orders.filter((o) => o.status === status),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Заявки</h1>
        <Button onClick={openBlank}>Новая заявка</Button>
      </header>

      {leads.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Необработанные обращения</h2>
          <ul className="space-y-2">
            {leads.map((lead) => (
              <LeadStrip key={lead.id} lead={lead} onCreate={openFromLead} />
            ))}
          </ul>
        </section>
      )}

      {formOpen && (
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <h2 className="mb-4 text-lg font-semibold">
            {fromLead ? "Заявка из обращения" : "Новая заявка"}
          </h2>

          <form action={action} className="grid gap-4 sm:grid-cols-2">
            {fromLead && <input type="hidden" name="lead_id" value={fromLead.id} />}
            <input type="hidden" name="source" value={fromLead?.source ?? "direct"} />

            <Field
              label="Телефон клиента"
              name="client_phone"
              type="tel"
              inputMode="tel"
              placeholder="+7 7XX XXX XX XX"
              required
              autoFocus
            />
            <Field label="Имя" name="client_name" placeholder="Необязательно" />
            <Field label="Адрес" name="address" placeholder="Улица, дом, квартира" />

            <Select label="Техника" name="appliance" defaultValue="washer">
              {APPLIANCES.map((a) => (
                <option key={a} value={a}>
                  {APPLIANCE_LABEL[a]}
                </option>
              ))}
            </Select>

            <Select label="Мастер" name="master_id" defaultValue="">
              <option value="">Назначить позже</option>
              {masters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </Select>

            <div className="sm:col-span-2">
              <TextArea label="Что случилось" name="problem" placeholder="Не отжимает, шумит…" />
            </div>

            {fromLead && (
              <p className="text-sm text-muted sm:col-span-2">
                Источник подставлен из обращения: {SOURCE_LABEL[fromLead.source]}
              </p>
            )}

            {state.error && (
              <p role="alert" className="text-sm text-danger sm:col-span-2">
                {state.error}
              </p>
            )}

            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Сохраняем…" : "Создать"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </section>
      )}

      {orders.length === 0 ? (
        <EmptyState title="Заявок пока нет" hint="Создайте первую или дождитесь обращения с сайта." />
      ) : (
        grouped.map((group) => (
          <section key={group.status}>
            <h2 className="mb-2 text-sm font-medium text-muted">
              {STATUS_LABEL[group.status]} · {group.items.length}
            </h2>
            <ul className="space-y-2">
              {group.items.map((order) => (
                <OrderRow key={order.id} order={order} masters={masters} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function OrderRow({ order, masters }: { order: Order; masters: Profile[] }) {
  const [saving, setSaving] = useState(false);

  async function onAssign(masterId: string) {
    if (!masterId) return;
    setSaving(true);
    await assignAction(order.id, masterId);
    setSaving(false);
  }

  return (
    <li className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium">
          №{order.number} · {order.client_name || "Клиент"}
        </span>
        <StatusPill status={order.status} />
        <span className="text-sm text-muted">{formatWhen(order.created_at)}</span>
        {order.total_amount != null && (
          <span className="ml-auto font-medium">{formatTenge(order.total_amount)}</span>
        )}
      </div>

      <p className="mt-1 text-muted">
        {APPLIANCE_LABEL[order.appliance]} · {formatPhone(order.client_phone)}
        {order.address ? ` · ${order.address}` : ""}
      </p>

      {order.problem && <p className="mt-1 text-sm text-muted">{order.problem}</p>}

      <div className="mt-3 flex items-center gap-3">
        <select
          value={order.master_id ?? ""}
          disabled={saving}
          onChange={(e) => onAssign(e.target.value)}
          aria-label="Назначить мастера"
          className="h-10 rounded-[var(--radius-card)] border border-border bg-surface px-3 text-sm"
        >
          <option value="">Мастер не назначен</option>
          {masters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted">{SOURCE_LABEL[order.source]}</span>
      </div>
    </li>
  );
}
