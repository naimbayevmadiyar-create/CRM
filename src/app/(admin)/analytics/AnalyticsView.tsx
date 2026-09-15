"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { formatDuration, formatTenge } from "@/lib/format";
import { SOURCE_LABEL, type Source } from "@/lib/source";
import { APPLIANCE_LABEL } from "@/lib/appliance";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Analytics } from "@/lib/db/analytics";
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

/** Обещание с сайта: мастер приезжает за 60 минут. Проверяем фактом. */
const PROMISED_MINUTES = 60;

export function AnalyticsView({
  data,
  days,
  taxPercent,
}: {
  data: Analytics;
  days: number;
  taxPercent: number;
}) {
  // Налог считается с оборота: по упрощённой декларации облагается весь
  // доход, а не то, что осталось компании после расчёта с мастером.
  const tax = Math.round((data.turnover * taxPercent) / 100);
  const afterTax = data.company_cut - tax;

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
        <h1 className="text-2xl font-semibold">Аналитика</h1>
        <nav className="flex gap-1" aria-label="Период">
          {PERIODS.map((p) => (
            <Link
              key={p.days}
              href={`/analytics?days=${p.days}`}
              aria-current={p.days === days ? "page" : undefined}
              className={
                "rounded-[var(--radius-card)] px-3 py-1.5 text-sm font-medium transition-colors " +
                (p.days === days
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
                hint="закупила компания"
              />
              <Tile
                label="Чистыми"
                value={formatTenge(data.net)}
                hint="оборот минус запчасти"
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
                <p className="text-sm text-muted">Прибыль компании</p>
                <p className="mt-1 text-3xl font-semibold">
                  {formatTenge(data.company_cut)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  доля от чистых по закрытым заказам
                </p>
              </div>

              <div className="rounded-[var(--radius-card)] border border-primary/30 bg-primary/5 p-5">
                <p className="text-sm text-muted">После налога</p>
                <p className="mt-1 text-3xl font-semibold text-primary">
                  {formatTenge(afterTax)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  минус налог {taxPercent} % с оборота — {formatTenge(tax)}
                </p>
              </div>
            </div>

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
                      <th className="px-4 py-3 font-medium">Прибыль компании</th>
                      <th className="px-4 py-3 font-medium">До выезда</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_master.map((row) => {
                      // расход не хранится отдельно: чистые — это оборот минус запчасти
                      const expenses = Math.max(0, row.turnover - row.net);
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
