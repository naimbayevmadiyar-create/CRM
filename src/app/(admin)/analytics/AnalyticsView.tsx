"use client";

import Link from "next/link";
import { FileDown } from "lucide-react";
import dynamic from "next/dynamic";
import { formatDuration, formatTenge, TIMEZONE } from "@/lib/format";
import { SOURCE_LABEL, type Source } from "@/lib/source";
import { APPLIANCE_LABEL } from "@/lib/appliance";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Analytics } from "@/lib/db/analytics";
import {
  EXPENSE_CATEGORY_LABEL,
  type ExpenseCategory,
} from "@/lib/expenseCategory";
import type { ApplianceKind } from "@/types/db";

/**
 * recharts тянет за собой больше кода, чем весь остальной экран.
 * Грузим его отдельно и только когда до графика дошло дело — цифры
 * в плитках появляются сразу, не дожидаясь библиотеки.
 */
const SourceChart = dynamic(() => import("./SourceChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});

const PERIODS = [
  { days: 7, label: "7 дней" },
  { days: 30, label: "30 дней" },
  { days: 90, label: "90 дней" },
];

/** Сегодня и вчера по Астане — расчёт с мастерами идёт по местным суткам. */
function dayKey(shift = 0): string {
  const now = new Date(Date.now() + shift * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function dayTitle(day: string): string {
  const date = new Date(`${day}T12:00:00+05:00`);
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "long",
    weekday: "short",
  }).format(date);
}

/** Обещание с сайта: мастер приезжает за 60 минут. Проверяем фактом. */
const PROMISED_MINUTES = 60;

export function AnalyticsView({
  data,
  days,
  day,
  taxPercent,
  partnerPercent,
  partnerName,
  spent,
}: {
  data: Analytics;
  days: number;
  /** Выбран один день — тогда период не показываем, а считаем за сутки. */
  day: string | null;
  taxPercent: number;
  partnerPercent: number;
  partnerName: string | null;
  /** Расходы компании за тот же период: реклама, аренда, прочее. */
  spent: {
    total: number;
    byCategory: [ExpenseCategory, number][];
    byDay: [string, number][];
  };
}) {
  /*
    Схема расчёта сервиса: касса минус расходы и налог — чистая прибыль,
    и уже от неё считается доля партнёра. Кассой здесь считается прибыль
    компании по закрытым заказам, то есть то, что осталось после расчёта
    с мастерами и оплаты запчастей. Налог считается с оборота: по упрощённой
    декларации облагается весь доход, а не остаток.
  */
  const tax = Math.round((data.turnover * taxPercent) / 100);
  const netProfit = data.company_cut - spent.total - tax;
  const partnerCut = Math.round((netProfit * partnerPercent) / 100);
  const ownerCut = netProfit - partnerCut;
  const spentByDay = new Map(spent.byDay);

  const toOrder = data.leads > 0 ? Math.round((data.orders / data.leads) * 100) : 0;
  const toDone = data.orders > 0 ? Math.round((data.done / data.orders) * 100) : 0;

  const chart = data.by_source.map((row) => ({
    name: SOURCE_LABEL[row.source as Source] ?? row.source,
    orders: row.orders,
  }));

  // Средняя доля расхода по всему сервису — от неё и меряем каждого мастера
  const averageExpenseShare = data.turnover > 0 ? data.expenses / data.turnover : 0;

  /**
   * Подсвечиваем, когда доля расхода в полтора раза выше средней и выше 10 %.
   * Нижний порог нужен, чтобы при почти нулевом среднем не краснело всё подряд.
   */
  const isSuspicious = (share: number, expenses: number) =>
    expenses > 0 && share > 0.1 && share > averageExpenseShare * 1.5;

  const median = data.median_minutes_to_departure;
  const keepsPromise = median != null && median <= PROMISED_MINUTES;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Аналитика</h1>
          {day && (
            <p className="mt-1 text-muted">
              За {dayTitle(day)} ·{" "}
              <Link href="/analytics" className="underline underline-offset-4">
                вернуться к периоду
              </Link>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={day ? `/print/report?day=${day}` : `/print/report?days=${days}`}
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-card)]
                       border border-border bg-surface px-3 text-sm font-medium"
          >
            <FileDown size={15} aria-hidden className="text-muted" />
            Отчёт в PDF
          </Link>
        </div>

        <nav className="flex flex-wrap gap-1" aria-label="Период">
          <Link
            href={`/analytics?day=${dayKey()}`}
            aria-current={day === dayKey() ? "page" : undefined}
            className={
              "rounded-[var(--radius-card)] px-3 py-1.5 text-sm font-medium transition-colors " +
              (day === dayKey()
                ? "bg-primary text-primaryink"
                : "bg-surface2 text-muted hover:text-text")
            }
          >
            Сегодня
          </Link>
          <Link
            href={`/analytics?day=${dayKey(-1)}`}
            aria-current={day === dayKey(-1) ? "page" : undefined}
            className={
              "rounded-[var(--radius-card)] px-3 py-1.5 text-sm font-medium transition-colors " +
              (day === dayKey(-1)
                ? "bg-primary text-primaryink"
                : "bg-surface2 text-muted hover:text-text")
            }
          >
            Вчера
          </Link>
          {PERIODS.map((p) => (
            <Link
              key={p.days}
              href={`/analytics?days=${p.days}`}
              aria-current={!day && p.days === days ? "page" : undefined}
              className={
                "rounded-[var(--radius-card)] px-3 py-1.5 text-sm font-medium transition-colors " +
                (!day && p.days === days
                  ? "bg-primary text-primaryink"
                  : "bg-surface2 text-muted hover:text-text")
              }
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </header>

      {data.orders === 0 && data.leads === 0 ? (
        <EmptyState
          title="За этот период данных нет"
          hint="Появятся заявки — здесь будут цифры. Попробуйте выбрать период подлиннее."
        />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Обращений" value={String(data.leads)} />
            <Tile label="Заявок" value={String(data.orders)} />
            <Tile label="Выполнено" value={String(data.done)} />
            <Tile label="Средний чек" value={formatTenge(data.avg_check)} hint="цена одного ремонта" />
          </section>

          {/* Деньги разложены на три величины: раньше «выручка» и «средний чек»
              показывали одно и то же число и ничего не объясняли. */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Деньги</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Tile
                label="Оборот"
                value={formatTenge(data.turnover)}
                hint="согласовано с клиентами"
              />
              <Tile
                label="Запчасти"
                value={formatTenge(data.expenses)}
                hint={
                  data.expenses === 0
                    ? "расхода не было"
                    : `компания ${formatTenge(data.expenses_company)} · мастера ${formatTenge(
                        data.expenses_master,
                      )}`
                }
              />
              <Tile
                label="Чистыми"
                value={formatTenge(data.net)}
                hint="оборот минус запчасти"
              />
            </div>

            <div className="mt-3 rounded-[var(--radius-card)] border border-border bg-surface p-5">
              <p className="text-sm text-muted">Касса — прибыль компании</p>
              <p className="mt-1 text-3xl font-semibold">{formatTenge(data.company_cut)}</p>
              <p className="mt-1 text-sm text-muted">
                доля от чистых по закрытым заказам, до расходов и налога
              </p>
            </div>

            <section className="mt-3 rounded-[var(--radius-card)] border border-border bg-surface p-5">
              <h3 className="text-lg font-semibold">Итог компании</h3>
              <p className="mt-1 text-sm text-muted">
                Касса минус расходы — чистая прибыль.{" "}
                <Link href="/expenses" className="underline underline-offset-4">
                  Записать расход
                </Link>
              </p>

              <dl className="mt-4 space-y-1.5 text-[15px]">
                <Line label="Касса — прибыль по закрытым заказам" value={formatTenge(data.company_cut)} />
                {spent.byCategory.map(([category, sum]) => (
                  <Line
                    key={category}
                    label={EXPENSE_CATEGORY_LABEL[category]}
                    value={`− ${formatTenge(sum)}`}
                  />
                ))}
                {spent.total === 0 && (
                  <Line label="Расходы компании" value="не записаны" muted />
                )}
                <Line label={`Налог · ${taxPercent} % с оборота`} value={`− ${formatTenge(tax)}`} />
                <div className="border-t border-border pt-1.5">
                  <Line
                    label="Чистая прибыль"
                    value={formatTenge(netProfit)}
                    strong
                    tone={netProfit < 0 ? "bad" : undefined}
                  />
                </div>
              </dl>

              {partnerPercent > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[var(--radius-card)] bg-surface2 p-4">
                    <p className="text-sm text-muted">
                      {partnerName ? `${partnerName} · ${partnerPercent} %` : `Партнёру · ${partnerPercent} %`}
                    </p>
                    <p className="mt-1 text-2xl font-semibold">{formatTenge(partnerCut)}</p>
                  </div>
                  <div className="rounded-[var(--radius-card)] border border-primary/30 bg-primary/5 p-4">
                    <p className="text-sm text-muted">Вам · {100 - partnerPercent} %</p>
                    <p className="mt-1 text-2xl font-semibold text-primary">
                      {formatTenge(ownerCut)}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {(data.cash > 0 || data.transfer > 0) && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Tile label="Приняли наличными" value={formatTenge(data.cash)} small />
                <Tile label="Пришло на счёт" value={formatTenge(data.transfer)} small />
              </div>
            )}
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <Tile label="Обращение → заявка" value={`${toOrder} %`} small />
            <Tile label="Заявка → выполнено" value={`${toDone} %`} small />
            <Tile
              label="Медиана до выезда"
              value={median == null ? "нет данных" : formatDuration(median)}
              hint={
                median == null
                  ? "никто ещё не отмечал выезд"
                  : keepsPromise
                    ? "укладываемся в обещанные 60 минут"
                    : "обещаем 60 минут — не укладываемся"
              }
              tone={median == null ? undefined : keepsPromise ? "good" : "bad"}
              small
            />
          </section>

          {data.canceled > 0 && (
            <p className="text-sm text-muted">
              Отменённых заявок за период: <b className="text-text">{data.canceled}</b>
            </p>
          )}

          {chart.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Откуда приходят заявки</h2>
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
                <SourceChart data={chart} />

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[440px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted">
                        <th className="py-2 font-medium">Источник</th>
                        <th className="py-2 font-medium">Заявок</th>
                        <th className="py-2 font-medium">Оборот</th>
                        <th className="py-2 font-medium">Прибыль</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_source.map((row) => (
                        <tr key={row.source} className="border-b border-border last:border-0">
                          <td className="py-2">
                            {SOURCE_LABEL[row.source as Source] ?? row.source}
                          </td>
                          <td className="py-2">{row.orders}</td>
                          <td className="py-2">{formatTenge(row.turnover)}</td>
                          <td className="py-2 font-medium">{formatTenge(row.company_cut)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {data.by_master.length > 0 && (
            <section>
              <h2 className="mb-1 text-lg font-semibold">Мастера</h2>
              {/* Расход в деньгах сам по себе мало что говорит: у кого больше
                  заказов, у того и запчастей больше. Сравнивать честно долю
                  расхода от оборота — она и выдаёт того, кто завышает. */}
              <p className="mb-3 text-sm text-muted">
                Средняя доля расхода по сервису — {formatPercent(averageExpenseShare)}.
                Заметно выше среднего подсвечено: стоит посмотреть, на что уходят деньги.
                «Мастеру» — сколько отдать за период: его доля плюс возврат за детали,
                которые он купил сам.
              </p>
              <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="px-4 py-3 font-medium">Мастер</th>
                      <th className="px-4 py-3 font-medium">Заявок</th>
                      <th className="px-4 py-3 font-medium">Оборот</th>
                      <th className="px-4 py-3 font-medium">Расход</th>
                      <th className="px-4 py-3 font-medium">Доля расхода</th>
                      <th className="px-4 py-3 font-medium">Чистыми</th>
                      <th className="px-4 py-3 font-medium">Мастеру</th>
                      <th className="px-4 py-3 font-medium">Прибыль компании</th>
                      <th className="px-4 py-3 font-medium">До выезда</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_master.map((row) => {
                      // расход не хранится отдельно: чистые — это оборот минус запчасти
                      const expenses = row.expenses;
                      // заработок мастера плюс возврат за детали, купленные им
                      const payout = row.net - row.company_cut + row.expenses_master;
                      const share = row.turnover > 0 ? expenses / row.turnover : 0;
                      const suspicious = isSuspicious(share, expenses);

                      return (
                        <tr key={row.master} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 font-medium">{row.master}</td>
                          <td className="px-4 py-3">{row.orders}</td>
                          <td className="px-4 py-3">{formatTenge(row.turnover)}</td>
                          <td className="px-4 py-3">
                            {expenses > 0 ? formatTenge(expenses) : "—"}
                          </td>
                          <td
                            className={
                              "px-4 py-3 " + (suspicious ? "font-semibold text-warning" : "")
                            }
                            title={suspicious ? "Заметно выше среднего по сервису" : undefined}
                          >
                            {row.turnover > 0 ? formatPercent(share) : "—"}
                          </td>
                          <td className="px-4 py-3">{formatTenge(row.net)}</td>
                          <td
                            className="px-4 py-3 font-medium text-primary"
                            title={
                              row.expenses_master > 0
                                ? `Доля ${formatTenge(row.net - row.company_cut)} плюс возврат за детали ${formatTenge(row.expenses_master)}`
                                : undefined
                            }
                          >
                            {formatTenge(payout)}
                          </td>
                          <td className="px-4 py-3 font-medium">{formatTenge(row.company_cut)}</td>
                          <td className="px-4 py-3 text-muted">
                            {row.avg_minutes == null ? "—" : formatDuration(row.avg_minutes)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {data.by_day.length > 0 && !day && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">По дням</h2>
              <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="px-4 py-3 font-medium">День</th>
                      <th className="px-4 py-3 font-medium">Заявок</th>
                      <th className="px-4 py-3 font-medium">Оборот</th>
                      <th className="px-4 py-3 font-medium">Запчасти</th>
                      <th className="px-4 py-3 font-medium">Чистыми</th>
                      <th className="px-4 py-3 font-medium">Мастерам</th>
                      <th className="px-4 py-3 font-medium">Касса</th>
                      <th className="px-4 py-3 font-medium">Расходы</th>
                      <th className="px-4 py-3 font-medium">Чистая прибыль</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_day.map((row) => (
                      <tr key={row.day} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <Link
                            href={`/analytics?day=${row.day}`}
                            className="font-medium underline underline-offset-4"
                          >
                            {dayTitle(row.day)}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{row.orders}</td>
                        <td className="px-4 py-3">{formatTenge(row.turnover)}</td>
                        <td className="px-4 py-3">
                          {row.expenses > 0 ? formatTenge(row.expenses) : "—"}
                        </td>
                        <td className="px-4 py-3">{formatTenge(row.net)}</td>
                        <td className="px-4 py-3 font-medium text-primary">
                          {formatTenge(row.net - row.company_cut + row.expenses_master)}
                        </td>
                        <td className="px-4 py-3">{formatTenge(row.company_cut)}</td>
                        <td className="px-4 py-3">
                          {spentByDay.get(row.day)
                            ? `− ${formatTenge(spentByDay.get(row.day) ?? 0)}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {formatTenge(row.company_cut - (spentByDay.get(row.day) ?? 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-sm text-muted">
                Нажмите на день — увидите его целиком: сколько кому отдать и откуда
                пришли заявки.
              </p>
            </section>
          )}

          {data.by_appliance.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Техника</h2>
              <ul className="divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface">
                {data.by_appliance.map((row) => (
                  <li
                    key={row.appliance}
                    className="flex justify-between gap-4 px-4 py-3 text-sm"
                  >
                    <span>
                      {APPLIANCE_LABEL[row.appliance as ApplianceKind] ?? row.appliance}
                    </span>
                    <span className="text-muted">
                      {row.orders} заявок · {formatTenge(row.turnover)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  small,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  small?: boolean;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={
          (small ? "mt-1 text-xl font-semibold " : "mt-1 text-2xl font-semibold ") +
          (tone === "good" ? "text-success" : tone === "bad" ? "text-warning" : "")
        }
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function formatPercent(share: number): string {
  return `${Math.round(share * 100)} %`;
}

function Line({
  label,
  value,
  strong,
  muted,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  tone?: "bad";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd
        className={
          (strong ? "text-xl font-semibold " : "font-medium ") +
          (tone === "bad" ? "text-danger" : muted ? "text-muted" : "")
        }
      >
        {value}
      </dd>
    </div>
  );
}
