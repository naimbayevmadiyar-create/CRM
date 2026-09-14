"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { BanknoteArrowUp, Check, FileText, Pencil, Printer, Receipt, Search, X } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { OrderMoney } from "@/components/OrderMoney";
import { LeadStrip } from "@/components/LeadStrip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextArea } from "@/components/ui/Field";
import { formatDateTime, formatPhone, formatTenge, formatWhen } from "@/lib/format";
import { APPLIANCES, APPLIANCE_LABEL } from "@/lib/appliance";
import { SOURCE_LABEL } from "@/lib/source";
import { STATUS_LABEL, STATUSES } from "@/lib/status";
import type { Order } from "@/lib/db/orders";
import type { Lead } from "@/lib/db/leads";
import type { Profile } from "@/lib/db/profiles";
import {
  assignAction,
  cancelAction,
  confirmCashAction,
  createOrderAction,
  revertCashAction,
  type OrderFormState,
} from "./actions";
import { invoiceForOrderAction } from "../invoices/actions";
import { OrderDetails } from "./OrderDetails";
import { OrderEditForm } from "./OrderEditForm";

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
  pendingCash,
}: {
  orders: Order[];
  masters: Profile[];
  leads: Lead[];
  fromLead: Lead | null;
  query: string;
  status: string;
  repeatPhones: string[];
  /** Кто ещё не сдал наличные по закрытым заявкам. */
  pendingCash: { name: string; amount: number; orders: number }[];
}) {
  const repeat = new Set(repeatPhones);
  const [state, action, pending] = useActionState(createOrderAction, INITIAL);
  // форма раскрыта сразу, если пришли из обращения; после создания сервер
  // уводит на /orders, и она закрывается сама
  const [formOpen, setFormOpen] = useState(Boolean(fromLead));
  // блок реквизитов показываем, только если заказчик организация:
  // физлицам эти поля мешают
  const [isLegal, setIsLegal] = useState(false);
  // мелкую технику часто приносят в офис — тогда адрес выезда не нужен
  const [atServiceCenter, setAtServiceCenter] = useState(false);

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

      {pendingCash.length > 0 && (
        <section className="rounded-[var(--radius-card)] border border-warning/40 bg-warning/5 p-4">
          <h2 className="text-sm font-medium">Наличные ещё не в кассе</h2>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {pendingCash.map((row) => (
              <li key={row.name}>
                <b>{row.name}</b> — {formatTenge(row.amount)}{" "}
                <span className="text-muted">({row.orders})</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Принял деньги — нажмите «Подтвердить оплату» в заявке, и она уйдёт отсюда.
          </p>
        </section>
      )}

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

            {atServiceCenter ? (
              <p className="self-end pb-3 text-sm text-muted">
                Технику принесут к нам — адрес не нужен
              </p>
            ) : (
              <Field label="Адрес" name="address" placeholder="Улица, дом, квартира" />
            )}

            <label className="flex items-center gap-2.5 sm:col-span-2">
              <input
                type="checkbox"
                name="at_service_center"
                checked={atServiceCenter}
                onChange={(e) => setAtServiceCenter(e.target.checked)}
                className="h-5 w-5 accent-[var(--primary)]"
              />
              <span>Технику приносят в сервисный центр</span>
            </label>

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

            <Field
              label={atServiceCenter ? "Когда принесут" : "Когда выехать"}
              name="scheduled_at"
              type="datetime-local"
            />

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
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const masterName = masters.find((m) => m.id === order.master_id)?.full_name ?? null;

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

  async function onConfirmCash() {
    setBusy(true);
    setError(null);
    const result = await confirmCashAction(order.id);
    if ("error" in result && result.error) setError(result.error);
    setBusy(false);
  }

  async function onRevertCash() {
    setBusy(true);
    setError(null);
    const result = await revertCashAction(order.id);
    if ("error" in result && result.error) setError(result.error);
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

        {order.status === "done" && (
          <span
            className={
              "ml-auto rounded-full px-2.5 py-1 text-xs font-medium " +
              (order.cash_confirmed_at
                ? "bg-success/12 text-success"
                : "bg-warning/12 text-warning")
            }
          >
            {order.cash_confirmed_at ? "Деньги в кассе" : "Деньги не сданы"}
          </span>
        )}
      </div>

      <p className="mt-1 text-muted">
        {APPLIANCE_LABEL[order.appliance]} · {formatPhone(order.client_phone)}
        {order.at_service_center
          ? " · Сервисный центр"
          : order.address
            ? ` · ${order.address}`
            : ""}
      </p>

      {order.problem && <p className="mt-1 text-sm text-muted">{order.problem}</p>}

      {order.scheduled_at && (
        <p className="mt-1 text-sm text-muted">
          {order.at_service_center ? "Приём: " : "Выезд: "}
          {formatDateTime(order.scheduled_at)}
        </p>
      )}

      {order.total_amount != null && (
        <div className="mt-3">
          <OrderMoney
            total={order.total_amount}
            expenses={order.expenses}
            paymentMethod={order.payment_method}
            sharePercent={order.company_share_percent}
          />
        </div>
      )}

      {order.status === "done" && (
        <div className="mt-2">
          {order.cash_confirmed_at ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <Check size={15} aria-hidden className="text-success" />
              Оплата подтверждена {formatDateTime(order.cash_confirmed_at)}
              <button
                onClick={onRevertCash}
                disabled={busy}
                className="underline underline-offset-4"
              >
                отменить
              </button>
            </span>
          ) : (
            <button
              onClick={onConfirmCash}
              disabled={busy}
              className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-card)]
                         bg-primary px-4 text-sm font-medium text-primaryink
                         disabled:opacity-60"
            >
              <BanknoteArrowUp size={16} aria-hidden />
              Подтвердить оплату
            </button>
          )}
        </div>
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
          <form action={invoiceForOrderAction.bind(null, order.id)}>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-[var(--radius-card)]
                         bg-surface2 px-2.5 py-1.5 text-xs font-medium text-muted
                         transition-colors hover:text-text"
            >
              <Receipt size={14} aria-hidden />
              Счёт
            </button>
          </form>
        </span>

        <OrderDetails order={order} masterName={masterName} />

        <button
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
          className="inline-flex items-center gap-1 text-sm text-muted
                     underline underline-offset-4 hover:text-text"
        >
          <Pencil size={14} aria-hidden />
          Изменить
        </button>

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

      {editing && (
        <OrderEditForm order={order} onDone={() => setEditing(false)} />
      )}

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
