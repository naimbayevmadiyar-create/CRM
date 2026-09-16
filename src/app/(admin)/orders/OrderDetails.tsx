"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, formatDateTime, formatDuration, formatTenge } from "@/lib/format";
import { calcSettlement, PAYMENT_LABEL } from "@/lib/settlement";
import { STATUS_LABEL } from "@/lib/status";
import type { Order } from "@/lib/db/orders";
import { orderDetailsAction, type OrderDetails as Details } from "./actions";

/**
 * Раскрывающийся отчёт по заявке.
 *
 * Директору нужно открыть закрытую заявку и увидеть, что именно делали,
 * на что ушли деньги на запчасти и сколько мастер внёс в кассу. В списке
 * это не помещается, поэтому грузим по нажатию — и только для той заявки,
 * которую открыли.
 */
export function OrderDetails({
  order,
  masterName,
}: {
  order: Order;
  masterName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);

  const closed = order.status === "done" || order.status === "canceled";

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || data) return;

    setError(null);
    const result = await orderDetailsAction(order.id);
    if ("error" in result) setError(result.error);
    else setData(result);
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-sm text-muted
                   underline underline-offset-4 hover:text-text"
      >
        {closed ? "Отчёт" : "Подробнее"}
        <ChevronDown
          size={14}
          aria-hidden
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="mt-3 w-full rounded-[var(--radius-card)] bg-surface2 p-4 text-sm">
          {error ? (
            <p role="alert" className="text-danger">
              {error}
            </p>
          ) : !data ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <Report order={order} masterName={masterName} data={data} />
          )}
        </div>
      )}
    </>
  );
}

function Report({
  order,
  masterName,
  data,
}: {
  order: Order;
  masterName: string | null;
  data: Details;
}) {
  const total = order.total_amount ?? 0;
  const settlement = calcSettlement({
    total,
    expenses: order.expenses,
    expensesPayer: order.expenses_payer,
    sharePercent: order.company_share_percent,
    paymentMethod: order.payment_method ?? "cash",
  });

  const finished = data.history.find((e) => e.to_status === "done");
  const canceled = data.history.find((e) => e.to_status === "canceled");

  return (
    <div className="space-y-4">
      <p className="text-muted">
        Мастер: <b className="text-text">{masterName ?? "не назначен"}</b>
        {finished && <> · закрыта {formatDateTime(finished.created_at)}</>}
        {canceled && <> · отменена {formatDateTime(canceled.created_at)}</>}
      </p>

      {canceled?.note && (
        <p className="text-muted">
          Причина отмены: <b className="text-text">{canceled.note}</b>
        </p>
      )}

      <section>
        <h3 className="mb-1.5 font-medium">Выполненные работы</h3>
        {data.items.length === 0 ? (
          <p className="text-muted">Перечень не заполняли — только общая сумма.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-1.5">
                <span>
                  {item.title}
                  {item.quantity > 1 && (
                    <span className="text-muted"> × {item.quantity}</span>
                  )}
                  {item.warranty_months > 0 && (
                    <span className="text-muted">
                      {" "}
                      · гарантия {item.warranty_months} мес.
                    </span>
                  )}
                </span>
                <span className="whitespace-nowrap">
                  {formatTenge(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {total > 0 && (
        <section>
          <h3 className="mb-1.5 font-medium">Деньги</h3>
          <dl>
            <Line label="Согласовано" value={formatTenge(total)} />
            <Line
              /* главный вопрос директора к закрытой заявке — на что ушёл расход */
              label={
                order.expenses > 0
                  ? `Запчасти (${order.expenses_payer === "master" ? "деньги мастера" : "деньги компании"}) · ${
                      order.expenses_note || "на что — не указано"
                    }`
                  : "Запчасти"
              }
              value={order.expenses > 0 ? `− ${formatTenge(order.expenses)}` : "не было"}
            />
            <Line label="Чистыми" value={formatTenge(settlement.net)} />
            <Line label="Мастеру" value={formatTenge(settlement.masterCut)} />
            <Line
              label={`Прибыль компании · ${settlement.sharePercent}%`}
              value={formatTenge(settlement.companyCut)}
              strong
            />
            {order.payment_method && (
              <Line
                label={
                  settlement.direction === "master_owes"
                    ? `${PAYMENT_LABEL[order.payment_method]} · мастер внёс`
                    : `${PAYMENT_LABEL[order.payment_method]} · выплатить мастеру`
                }
                value={formatTenge(settlement.amount)}
                strong
              />
            )}
          </dl>
        </section>
      )}

      {data.history.length > 0 && (
        <section>
          <h3 className="mb-1.5 font-medium">Как шла заявка</h3>
          <ol className="space-y-1">
            {data.history.map((event, index) => {
              const previous = index > 0 ? data.history[index - 1] : null;
              const minutes = previous
                ? Math.round(
                    (new Date(event.created_at).getTime() -
                      new Date(previous.created_at).getTime()) /
                      60000,
                  )
                : null;

              return (
                <li key={event.id} className="flex justify-between gap-4 text-muted">
                  <span>
                    <b className="font-medium text-text">
                      {STATUS_LABEL[event.to_status]}
                    </b>
                    {event.actor_role === "master" && " · мастер"}
                    {event.actor_role === "admin" && " · диспетчер"}
                  </span>
                  <span className="whitespace-nowrap">
                    {formatDateTime(event.created_at)}
                    {minutes != null && minutes > 0 && ` (+${formatDuration(minutes)})`}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("whitespace-nowrap", strong && "font-semibold")}>{value}</dd>
    </div>
  );
}
