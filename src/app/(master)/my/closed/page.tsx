import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import { requireMaster } from "@/lib/auth";
import { listClosedOrdersForMaster } from "@/lib/db/orders";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import { APPLIANCE_LABEL } from "@/lib/appliance";
import { formatDateTime, formatTenge } from "@/lib/format";
import { calcSettlement, PAYMENT_LABEL } from "@/lib/settlement";

export const metadata: Metadata = { title: "Закрытые заявки" };

/**
 * Архив мастера.
 *
 * Раньше при входе он сразу попадал в открытую заявку и не мог поднять свой
 * же отчёт: что делал, сколько согласовал, сколько сдал. Здесь это видно,
 * и отсюда же печатаются документы по уже закрытой работе.
 */
export default async function ClosedOrdersPage() {
  const session = await requireMaster();
  const orders = await listClosedOrdersForMaster(session.masterId);

  return (
    <main className="safe-x mx-auto max-w-lg space-y-4 p-4">
      <header className="safe-top flex items-center gap-3 px-1 pt-2">
        <Link
          href="/my"
          aria-label="Назад к заявкам"
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] bg-surface2"
        >
          <ArrowLeft size={18} aria-hidden />
        </Link>
        <h1 className="text-2xl font-semibold">Закрытые</h1>
      </header>

      {orders.length === 0 ? (
        <EmptyState
          title="Закрытых заявок пока нет"
          hint="Здесь будут все ваши выполненные работы с суммами и документами."
        />
      ) : (
        <ul className="safe-bottom space-y-3">
          {orders.map((order) => {
            const total = order.total_amount ?? 0;
            const settlement = calcSettlement({
              total,
              expenses: order.expenses,
              sharePercent: order.company_share_percent,
              paymentMethod: order.payment_method ?? "cash",
            });

            return (
              <li
                key={order.id}
                className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-medium">
                    №{order.number} · {order.client_name || "Клиент"}
                  </span>
                  <StatusPill status={order.status} />
                  <span className="ml-auto font-semibold">{formatTenge(total)}</span>
                </div>

                <p className="mt-1 text-sm text-muted">
                  {APPLIANCE_LABEL[order.appliance]} · {formatDateTime(order.created_at)}
                </p>

                {total > 0 && (
                  <dl className="mt-3 rounded-[var(--radius-card)] bg-surface2 p-3 text-sm">
                    <Row label="Согласовано" value={formatTenge(total)} />
                    {order.expenses > 0 && (
                      <Row
                        label={
                          order.expenses_note
                            ? `Запчасти · ${order.expenses_note}`
                            : "Запчасти"
                        }
                        value={`− ${formatTenge(order.expenses)}`}
                      />
                    )}
                    <Row label="Чистыми" value={formatTenge(settlement.net)} />
                    <Row label="Вы заработали" value={formatTenge(settlement.masterCut)} />
                    {order.payment_method && (
                      <Row
                        label={
                          settlement.direction === "master_owes"
                            ? `${PAYMENT_LABEL[order.payment_method]} · внесли в кассу`
                            : `${PAYMENT_LABEL[order.payment_method]} · вам переведут`
                        }
                        value={formatTenge(settlement.amount)}
                        strong
                      />
                    )}
                    <Row
                      label="Деньги в кассе"
                      value={order.cash_confirmed_at ? "приняты" : "ещё не приняты"}
                    />
                  </dl>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <DocLink href={`/print/act/${order.id}`}>
                    <FileText size={14} aria-hidden />
                    Акт
                  </DocLink>
                  <DocLink href={`/print/workorder/${order.id}`}>
                    <Printer size={14} aria-hidden />
                    Заказ-наряд
                  </DocLink>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <dt className="text-muted">{label}</dt>
      <dd className={strong ? "font-semibold" : ""}>{value}</dd>
    </div>
  );
}

function DocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-card)]
                 bg-surface2 px-3 text-sm font-medium text-muted"
    >
      {children}
    </Link>
  );
}
