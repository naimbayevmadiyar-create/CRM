"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { FileText, Printer, Receipt, Search, X } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { OrderMoney } from "@/components/OrderMoney";
import { LeadStrip } from "@/components/LeadStrip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextArea } from "@/components/ui/Field";
import { formatDateTime, formatPhone, formatWhen } from "@/lib/format";
import { APPLIANCES, APPLIANCE_LABEL } from "@/lib/appliance";
import { SOURCE_LABEL } from "@/lib/source";
import { STATUS_LABEL, STATUSES } from "@/lib/status";
import type { Order } from "@/lib/db/orders";
import type { Lead } from "@/lib/db/leads";
import type { Profile } from "@/lib/db/profiles";
import { assignAction, cancelAction, createOrderAction, type OrderFormState } from "./actions";

const INITIAL: OrderFormState = {};

const FILTERS: { value: string; label: string }[] = [
  { value: "active", label: "В работе" },
  { value: "", label: "Все" },
  ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
];

export function OrdersView({
  orders,
  masters,
  leads,
  fromLead,
  query,
  status,
  repeatPhones,
}: {
  orders: Order[];
  masters: Profile[];
  leads: Lead[];
  fromLead: Lead | null;
  query: string;
  status: string;
  repeatPhones: string[];
}) {
  const repeat = new Set(repeatPhones);
  const [state, action, pending] = useActionState(createOrderAction, INITIAL);
  // форма раскрыта сразу, если пришли из обращения; после создания сервер
  // уводит на /orders, и она закрывается сама
  const [formOpen, setFormOpen] = useState(Boolean(fromLead));
  // блок реквизитов показываем, только если заказчик организация:
  // физлицам эти поля мешают
  const [isLegal, setIsLegal] = useState(false);

  const grouped = STATUSES.map((s) => ({
    status: s,
    items: orders.filter((o) => o.status === s),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Заявки</h1>
        <Button onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? "Свернуть" : "Новая заявка"}
        </Button>
      </header>

      {/* Поиск и фильтр — обычная форма: фильтрация идёт на сервере,
          адрес можно скопировать и переслать. */}
      <form method="get" className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search
            size={17}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            name="q"
            defaultValue={query}
            placeholder="Телефон, имя, адрес"
            aria-label="Поиск по заявкам"
            className="h-11 w-full rounded-[var(--radius-card)] border border-border bg-surface
                       pl-10 pr-4 outline-none focus:border-primary"
          />
        </div>

        <select
          name="status"
          defaultValue={status}
          aria-label="Фильтр по этапу"
          className="h-11 rounded-[var(--radius-card)] border border-border bg-surface px-3"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <Button type="submit" variant="ghost">
          Найти
        </Button>

        {(query || status) && (
          <Link
            href="/orders"
            className="inline-flex h-11 items-center gap-1 rounded-[var(--radius-card)]
                       px-3 text-sm text-muted"
          >
            <X size={15} aria-hidden />
            Сбросить
          </Link>
        )}
      </form>

      {leads.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">
            Необработанные обращения
          </h2>
          <ul className="space-y-2">
            {leads.map((lead) => (
              <LeadStrip key={lead.id} lead={lead} />
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

            <Field label="Когда выехать" name="scheduled_at" type="datetime-local" />

            <Field label="Бренд" name="brand" placeholder="LG, Samsung, Bosch" />
            <Field label="Модель" name="model" placeholder="Необязательно" />
            <Field
              label="Серийный номер"
              name="serial_number"
              placeholder="Для акта приёма-передачи"
            />

            <label className="flex items-center gap-2.5 sm:col-span-2">
              <input
                type="checkbox"
                name="is_legal_entity"
                checked={isLegal}
                onChange={(e) => setIsLegal(e.target.checked)}
                className="h-5 w-5 accent-[var(--primary)]"
              />
              <span>Заказчик — юридическое лицо</span>
            </label>

            {isLegal && (
              <>
                <Field label="Организация" name="org_name" placeholder="ТОО «…»" />
                <Field label="БИН" name="org_bin" inputMode="numeric" />
                <div className="sm:col-span-2">
                  <Field label="Юридический адрес" name="org_address" />
                </div>
              </>
            )}

            <div className="sm:col-span-2">
              <TextArea
                label="Что случилось"
                name="problem"
                placeholder="Не отжимает, шумит при сливе…"
              />
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
        <EmptyState
          title={query || status ? "Ничего не нашлось" : "Заявок пока нет"}
          hint={
            query || status
              ? "Попробуйте другой запрос или сбросьте фильтр."
              : "Создайте первую или дождитесь обращения с сайта."
          }
        />
      ) : (
        grouped.map((group) => (
          <section key={group.status}>
            <h2 className="mb-2 text-sm font-medium text-muted">
              {STATUS_LABEL[group.status]} · {group.items.length}
            </h2>
            <ul className="space-y-2">
              {group.items.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  masters={masters}
                  isRepeat={repeat.has(order.client_phone)}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function OrderRow({
  order,
  masters,
  isRepeat,
}: {
  order: Order;
  masters: Profile[];
  isRepeat: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [masterId, setMasterId] = useState(order.master_id ?? "");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCancel = order.status !== "done" && order.status !== "canceled";

  async function onAssign(next: string) {
    if (!next) return;
    setMasterId(next); // мгновенный отклик, сервер догонит
    setBusy(true);
    setError(null);
    const result = await assignAction(order.id, next);
    if ("error" in result && result.error) {
      setMasterId(order.master_id ?? "");
      setError(result.error);
    }
    setBusy(false);
  }

  async function onCancel() {
    setBusy(true);
    setError(null);
    const result = await cancelAction(order.id, "Отменена диспетчером");
    if ("error" in result && result.error) setError(result.error);
    setBusy(false);
    setConfirmCancel(false);
  }

  return (
    <li className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium">
          №{order.number} · {order.client_name || "Клиент"}
        </span>
        <StatusPill status={order.status} />
        {isRepeat && (
          <span
            title="Обращается не в первый раз"
            className="rounded-full bg-success/12 px-2.5 py-1 text-xs font-medium text-success"
          >
            Повторный
          </span>
        )}
        <span className="text-sm text-muted">{formatWhen(order.created_at)}</span>
        {order.total_amount != null && (
          <span className="ml-auto">
            <OrderMoney
              total={order.total_amount}
              expenses={order.expenses}
              expensesNote={order.expenses_note}
              paymentMethod={order.payment_method}
              sharePercent={order.company_share_percent}
            />
          </span>
        )}
      </div>

      <p className="mt-1 text-muted">
        {APPLIANCE_LABEL[order.appliance]} · {formatPhone(order.client_phone)}
        {order.address ? ` · ${order.address}` : ""}
      </p>

      {order.problem && <p className="mt-1 text-sm text-muted">{order.problem}</p>}

      {order.scheduled_at && (
        <p className="mt-1 text-sm text-muted">
          Выезд: {formatDateTime(order.scheduled_at)}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <select
          value={masterId}
          disabled={busy || order.status === "done" || order.status === "canceled"}
          onChange={(e) => onAssign(e.target.value)}
          aria-label="Назначить мастера"
          className="h-10 rounded-[var(--radius-card)] border border-border bg-surface px-3 text-sm
                     disabled:opacity-60"
        >
          <option value="">Мастер не назначен</option>
          {masters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>

        <span className="text-sm text-muted">{SOURCE_LABEL[order.source]}</span>

        <span className="flex items-center gap-1">
          <DocLink href={`/print/act/${order.id}`} icon={<FileText size={14} />}>
            Акт
          </DocLink>
          <DocLink href={`/print/workorder/${order.id}`} icon={<Printer size={14} />}>
            Заказ-наряд
          </DocLink>
          <DocLink href={`/print/invoice/${order.id}`} icon={<Receipt size={14} />}>
            Счёт
          </DocLink>
        </span>

        {canCancel && (
          <div className="ml-auto">
            {confirmCancel ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="text-muted">Точно отменить?</span>
                <button
                  onClick={onCancel}
                  disabled={busy}
                  className="font-medium text-danger underline underline-offset-4"
                >
                  Да
                </button>
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="text-muted underline underline-offset-4"
                >
                  Нет
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmCancel(true)}
                className="text-sm text-muted underline underline-offset-4"
              >
                Отменить
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </li>
  );
}

/** Ссылка на печатный документ. Открывается в новой вкладке,
    чтобы не терять место в списке заявок. */
function DocLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      className="inline-flex items-center gap-1 rounded-[var(--radius-card)]
                 bg-surface2 px-2.5 py-1.5 text-xs font-medium text-muted
                 transition-colors hover:text-text"
    >
      {icon}
      {children}
    </Link>
  );
}
