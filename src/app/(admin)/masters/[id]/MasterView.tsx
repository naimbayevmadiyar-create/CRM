import Link from "next/link";
import { ArrowLeft, Clock, Phone } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { APPLIANCE_LABEL } from "@/lib/appliance";
import { formatDateTime, formatDuration, formatPhone, formatTenge, formatTime, TIMEZONE } from "@/lib/format";
import { calcSettlement } from "@/lib/settlement";
import { STATUS_LABEL, type Status } from "@/lib/status";
import type { Order } from "@/lib/db/orders";
import type { Profile } from "@/lib/db/profiles";

/**
 * Карточка мастера: чем занят сейчас и как расписан день.
 *
 * Диспетчеру, который раздаёт заявки, нужны два ответа: сколько на человеке
 * висит и когда у него окно. Раньше за этим приходилось листать общий список
 * и складывать в голове.
 */

/** Сколько времени по умолчанию занимает выезд. Точнее в системе не знает никто. */
const VISIT_MINUTES = 90;

/** Рабочий день сервиса — как на сайте: с 10:00 до 20:00. */
const DAY_START = 10 * 60;
const DAY_END = 20 * 60;

const dayName = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "long",
  weekday: "short",
});

/** Минуты от начала суток по Астане — на них строится расписание. */
function minutesOfDay(iso: string): number {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  const [hours, minutes] = parts.split(":").map(Number);
  return hours * 60 + minutes;
}

function localDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function clock(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00+05:00`);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function MasterView({
  master,
  orders,
  day,
  today,
  sharePercent,
}: {
  master: Profile;
  orders: { active: Order[]; waitingCash: Order[]; recentDone: Order[] };
  day: string;
  today: string;
  sharePercent: number;
}) {
  const counts: Record<string, number> = {};
  for (const order of orders.active) {
    counts[order.status] = (counts[order.status] ?? 0) + 1;
  }

  const owed = orders.waitingCash.reduce((sum, order) => {
    const { amount, direction } = calcSettlement({
      total: order.total_amount ?? 0,
      expenses: order.expenses,
      expensesPayer: order.expenses_payer,
      sharePercent: order.company_share_percent,
      paymentMethod: order.payment_method ?? "cash",
    });
    return direction === "master_owes" ? sum + amount : sum;
  }, 0);

  // Заявки выбранного дня по времени выезда — из них и складывается загрузка
  const planned = orders.active
    .filter((order) => order.scheduled_at && localDay(order.scheduled_at) === day)
    .map((order) => ({ order, start: minutesOfDay(order.scheduled_at as string) }))
    .sort((a, b) => a.start - b.start);

  const busyMinutes = planned.length * VISIT_MINUTES;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <Link
          href="/masters"
          aria-label="Ко всем мастерам"
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] bg-surface2"
        >
          <ArrowLeft size={18} aria-hidden />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{master.full_name}</h1>
          <p className="mt-0.5 text-muted">
            {master.phone ? formatPhone(master.phone) : "телефон не указан"} · доля
            компании {sharePercent} %{master.is_active ? "" : " · отключён"}
          </p>
        </div>
        {master.phone && (
          <a
            href={`tel:+${master.phone.replace(/\D/g, "")}`}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-[var(--radius-card)]
                       bg-surface2 px-4 text-sm font-medium"
          >
            <Phone size={16} aria-hidden />
            Позвонить
          </a>
        )}
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Назначено" value={counts.assigned ?? 0} />
        <Tile label="В пути" value={counts.on_the_way ?? 0} />
        <Tile label="В работе" value={counts.in_progress ?? 0} />
        <Tile
          label="Ждут расчёта"
          value={orders.waitingCash.length}
          hint={owed > 0 ? `не сдано ${formatTenge(owed)}` : undefined}
          warn={orders.waitingCash.length > 0}
        />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            День · {dayName.format(new Date(`${day}T12:00:00+05:00`))}
          </h2>
          <nav className="flex gap-1" aria-label="Выбрать день">
            <DayLink id={master.id} day={shiftDay(day, -1)} label="← назад" />
            <DayLink id={master.id} day={today} label="Сегодня" active={day === today} />
            <DayLink id={master.id} day={shiftDay(today, 1)} label="Завтра" active={day === shiftDay(today, 1)} />
            <DayLink id={master.id} day={shiftDay(day, 1)} label="вперёд →" />
          </nav>
        </div>

        {planned.length === 0 ? (
          <EmptyState
            title="На этот день выездов нет"
            hint="Весь день свободен — можно ставить заявки."
          />
        ) : (
          <>
            <p className="mb-2 text-sm text-muted">
              Выездов {planned.length} · занято примерно {formatDuration(busyMinutes)} из{" "}
              {formatDuration(DAY_END - DAY_START)}. На выезд считаем{" "}
              {formatDuration(VISIT_MINUTES)}.
            </p>

            <ol className="space-y-2">
              {planned.map(({ order, start }, index) => {
                const previousEnd =
                  index === 0 ? DAY_START : planned[index - 1].start + VISIT_MINUTES;
                const gap = start - previousEnd;

                return (
                  <li key={order.id} className="space-y-2">
                    {gap >= 30 && (
                      <p className="flex items-center gap-2 rounded-[var(--radius-card)]
                                    border border-dashed border-border px-4 py-2 text-sm text-muted">
                        <Clock size={14} aria-hidden />
                        Свободно {clock(previousEnd)} — {clock(start)} ·{" "}
                        {formatDuration(gap)}
                      </p>
                    )}

                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1
                                    rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3">
                      <span className="font-semibold">{clock(start)}</span>
                      <span className="font-medium">
                        №{order.number} · {order.client_name || "Клиент"}
                      </span>
                      <StatusPill status={order.status} />
                      <span className="w-full text-sm text-muted">
                        {APPLIANCE_LABEL[order.appliance]}
                        {order.at_service_center
                          ? " · Сервисный центр"
                          : order.address
                            ? ` · ${order.address}`
                            : ""}
                      </span>
                    </div>
                  </li>
                );
              })}

              {(() => {
                const last = planned[planned.length - 1];
                const end = last.start + VISIT_MINUTES;
                return end < DAY_END - 30 ? (
                  <li>
                    <p className="flex items-center gap-2 rounded-[var(--radius-card)]
                                  border border-dashed border-border px-4 py-2 text-sm text-muted">
                      <Clock size={14} aria-hidden />
                      Свободно {clock(end)} — {clock(DAY_END)} ·{" "}
                      {formatDuration(DAY_END - end)}
                    </p>
                  </li>
                ) : null;
              })()}
            </ol>
          </>
        )}
      </section>

      <Group title="Сейчас на руках" orders={orders.active} empty="Активных заявок нет" />
      <Group
        title="Ждут расчёта"
        orders={orders.waitingCash}
        empty="Все деньги сданы"
        money
      />
      <Group
        title="Последние закрытые"
        orders={orders.recentDone}
        empty="Закрытых заявок пока нет"
        money
      />
    </div>
  );
}

function Group({
  title,
  orders,
  empty,
  money,
}: {
  title: string;
  orders: Order[];
  empty: string;
  money?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">
        {title} · {orders.length}
      </h2>
      {orders.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[var(--radius-card)]
                         border border-border bg-surface px-4 py-3"
            >
              <Link
                href={`/orders?q=${order.number}`}
                className="font-medium underline underline-offset-4"
              >
                №{order.number}
              </Link>
              <span>{order.client_name || "Клиент"}</span>
              <StatusPill status={order.status as Status} />
              <span className="text-sm text-muted">
                {APPLIANCE_LABEL[order.appliance]}
                {order.scheduled_at ? ` · ${formatTime(order.scheduled_at)}` : ""}
              </span>
              {money && order.total_amount != null && (
                <span className="ml-auto font-medium">{formatTenge(order.total_amount)}</span>
              )}
              {!money && (
                <span className="ml-auto text-sm text-muted">
                  {STATUS_LABEL[order.status]} · {formatDateTime(order.created_at)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DayLink({
  id,
  day,
  label,
  active,
}: {
  id: string;
  day: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={`/masters/${id}?day=${day}`}
      aria-current={active ? "page" : undefined}
      className={
        "rounded-[var(--radius-card)] px-3 py-1.5 text-sm font-medium transition-colors " +
        (active ? "bg-primary text-primaryink" : "bg-surface2 text-muted hover:text-text")
      }
    >
      {label}
    </Link>
  );
}

function Tile({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: number;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div
      className={
        "rounded-[var(--radius-card)] border p-4 " +
        (warn && value > 0 ? "border-warning/40 bg-warning/5" : "border-border bg-surface")
      }
    >
      <p className="text-sm text-muted">{label}</p>
      <p className={"mt-1 text-2xl font-semibold " + (value === 0 ? "text-muted" : "")}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
