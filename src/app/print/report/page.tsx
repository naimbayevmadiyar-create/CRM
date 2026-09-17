import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getAnalytics } from "@/lib/db/analytics";
import { getCompany } from "@/lib/db/company";
import { listExpenses, summarize } from "@/lib/db/expenses";
import { APPLIANCE_LABEL } from "@/lib/appliance";
import { SOURCE_LABEL, type Source } from "@/lib/source";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/expenseCategory";
import { formatDuration, formatTenge, TIMEZONE } from "@/lib/format";
import { longDateRu, shortDateRu } from "@/lib/docs";
import type { ApplianceKind } from "@/types/db";
import { DocHeader } from "../DocHeader";
import { PrintBar } from "../PrintBar";
import "../print.css";

export const metadata: Metadata = { title: "Отчёт по аналитике" };

const ALLOWED_DAYS = [7, 30, 90];

function localDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Отчёт за период на бумагу.
 *
 * Отдельным PDF-движком не обзаводимся: браузер сам печатает и в принтер,
 * и в файл, а вёрстка остаётся та же, что у актов и счетов. На телефоне это
 * «Поделиться → Печать», на компьютере Ctrl+P → «Сохранить как PDF».
 */
export default async function ReportPage({
  searchParams,
}: {
  // в Next 16 searchParams — промис
  searchParams: Promise<{ days?: string; day?: string }>;
}) {
  await requireAdmin();
  const { days, day } = await searchParams;

  const parsed = Number(days);
  const span = ALLOWED_DAYS.includes(parsed) ? parsed : 30;
  const chosenDay = /^\d{4}-\d{2}-\d{2}$/.test(day ?? "") ? (day as string) : null;

  const to = chosenDay
    ? new Date(new Date(`${chosenDay}T00:00:00+05:00`).getTime() + 24 * 60 * 60 * 1000)
    : new Date();
  const from = chosenDay
    ? new Date(`${chosenDay}T00:00:00+05:00`)
    : new Date(to.getTime() - span * 24 * 60 * 60 * 1000);

  const [data, company, expenses] = await Promise.all([
    getAnalytics(from.toISOString(), to.toISOString()),
    getCompany(),
    listExpenses(localDay(from), localDay(new Date(to.getTime() - 1))),
  ]);

  const spent = summarize(expenses);
  const spentByDay = new Map(spent.byDay);

  const tax = Math.round((data.turnover * company.tax_percent) / 100);
  // налог входит в расчёт: партнёр получает долю уже после него
  const netProfit = data.company_cut - spent.total - tax;
  const partnerCut = Math.round((netProfit * company.partner_share_percent) / 100);
  const ownerCut = netProfit - partnerCut;

  const period = chosenDay
    ? longDateRu(`${chosenDay}T12:00:00+05:00`)
    : `${shortDateRu(from.toISOString())} — ${shortDateRu(to.toISOString())}`;

  const backHref = chosenDay ? `/analytics?day=${chosenDay}` : `/analytics?days=${span}`;

  return (
    <div className="print-page">
      <PrintBar backHref={backHref} title={`Отчёт · ${period}`} />

      <article className="sheet">
        <DocHeader
          company={company}
          subtitle="Отчёт по работе сервиса"
          title="Отчёт"
          number={chosenDay ? "за день" : `за ${span} дней`}
          date={period}
        />

        <h2 className="doc-section">Заявки</h2>
        <table>
          <tbody>
            <Row label="Обращений с сайта и рекламы" value={String(data.leads)} />
            <Row label="Заявок заведено" value={String(data.orders)} />
            <Row label="Выполнено" value={String(data.done)} />
            <Row label="Отменено" value={String(data.canceled)} />
            <Row label="Оплачено за период — по дню приёма денег" value={String(data.paid)} />
            <Row label="Средний чек" value={formatTenge(data.avg_check)} />
            <Row
              label="Медиана до выезда"
              value={
                data.median_minutes_to_departure == null
                  ? "нет данных"
                  : formatDuration(data.median_minutes_to_departure)
              }
            />
          </tbody>
        </table>

        <h2 className="doc-section">Деньги</h2>
        <table>
          <tbody>
            <Row label="Оборот — согласовано с клиентами" value={formatTenge(data.turnover)} />
            <Row label="Запчасти, всего" value={formatTenge(data.expenses)} />
            <Row label="  из них деньгами компании" value={formatTenge(data.expenses_company)} />
            <Row label="  из них деньгами мастеров" value={formatTenge(data.expenses_master)} />
            <Row label="Чистыми — оборот минус запчасти" value={formatTenge(data.net)} />
            <Row
              label="Мастерам — доли и возврат за детали"
              value={formatTenge(data.net - data.company_cut + data.expenses_master)}
            />
            <Row label="Касса — прибыль компании" value={formatTenge(data.company_cut)} bold />
            <Row label="Принято наличными" value={formatTenge(data.cash)} />
            <Row label="Пришло на счёт" value={formatTenge(data.transfer)} />
            <Row
              label={`Ещё не сдано на сегодня — заявок ${data.pending_orders}`}
              value={formatTenge(data.pending_turnover)}
            />
          </tbody>
        </table>

        <h2 className="doc-section">Итог компании</h2>
        <table>
          <tbody>
            <Row label="Касса" value={formatTenge(data.company_cut)} />
            {[...spent.byCategory].map(([category, sum]) => (
              <Row
                key={category}
                label={EXPENSE_CATEGORY_LABEL[category]}
                value={`− ${formatTenge(sum)}`}
              />
            ))}
            {spent.total === 0 && <Row label="Расходы компании" value="не записаны" />}
            <Row
              label={`Налог ${company.tax_percent} % с оборота`}
              value={`− ${formatTenge(tax)}`}
            />
            <Row label="Чистая прибыль" value={formatTenge(netProfit)} bold />
            {company.partner_share_percent > 0 && (
              <>
                <Row
                  label={`${company.partner_name ?? "Партнёру"} · ${company.partner_share_percent} %`}
                  value={formatTenge(partnerCut)}
                />
                <Row
                  label={`Владельцу · ${100 - company.partner_share_percent} %`}
                  value={formatTenge(ownerCut)}
                  bold
                />
              </>
            )}
          </tbody>
        </table>

        {data.by_master.length > 0 && (
          <>
            <h2 className="doc-section">Мастера</h2>
            <table>
              <thead>
                <tr>
                  <th>Мастер</th>
                  <th style={{ width: "10%" }}>Заявок</th>
                  <th style={{ width: "16%" }}>Оборот</th>
                  <th style={{ width: "15%" }}>Запчасти</th>
                  <th style={{ width: "16%" }}>Мастеру</th>
                  <th style={{ width: "17%" }}>Прибыль компании</th>
                </tr>
              </thead>
              <tbody>
                {data.by_master.map((row) => (
                  <tr key={row.master}>
                    <td>{row.master}</td>
                    <td className="num">{row.orders}</td>
                    <td className="num">{formatTenge(row.turnover)}</td>
                    <td className="num">{formatTenge(row.expenses)}</td>
                    <td className="num">
                      {formatTenge(row.net - row.company_cut + row.expenses_master)}
                    </td>
                    <td className="num">{formatTenge(row.company_cut)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {data.by_day.length > 0 && !chosenDay && (
          <>
            <h2 className="doc-section">По дням</h2>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "14%" }}>День</th>
                  <th style={{ width: "9%" }}>Заявок</th>
                  <th style={{ width: "10%" }}>Оплачено</th>
                  <th>Оборот</th>
                  <th>Мастерам</th>
                  <th>Касса</th>
                  <th>Расходы</th>
                  <th>Чистая прибыль</th>
                </tr>
              </thead>
              <tbody>
                {data.by_day.map((row) => (
                  <tr key={row.day}>
                    <td>{shortDateRu(`${row.day}T12:00:00+05:00`)}</td>
                    <td className="num">{row.orders}</td>
                    <td className="num">{row.paid}</td>
                    <td className="num">{formatTenge(row.turnover)}</td>
                    <td className="num">
                      {formatTenge(row.net - row.company_cut + row.expenses_master)}
                    </td>
                    <td className="num">{formatTenge(row.company_cut)}</td>
                    <td className="num">
                      {spentByDay.get(row.day) ? formatTenge(spentByDay.get(row.day) ?? 0) : "—"}
                    </td>
                    <td className="num">
                      {formatTenge(row.company_cut - (spentByDay.get(row.day) ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {data.by_source.length > 0 && (
          <>
            <h2 className="doc-section">Откуда пришли заявки</h2>
            <table>
              <thead>
                <tr>
                  <th>Источник</th>
                  <th style={{ width: "12%" }}>Заявок</th>
                  <th style={{ width: "22%" }}>Оборот</th>
                  <th style={{ width: "22%" }}>Прибыль компании</th>
                </tr>
              </thead>
              <tbody>
                {data.by_source.map((row) => (
                  <tr key={row.source}>
                    <td>{SOURCE_LABEL[row.source as Source] ?? row.source}</td>
                    <td className="num">{row.orders}</td>
                    <td className="num">{formatTenge(row.turnover)}</td>
                    <td className="num">{formatTenge(row.company_cut)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {data.by_appliance.length > 0 && (
          <>
            <h2 className="doc-section">Техника</h2>
            <table>
              <thead>
                <tr>
                  <th>Вид техники</th>
                  <th style={{ width: "15%" }}>Заявок</th>
                  <th style={{ width: "25%" }}>Оборот</th>
                </tr>
              </thead>
              <tbody>
                {data.by_appliance.map((row) => (
                  <tr key={row.appliance}>
                    <td>{APPLIANCE_LABEL[row.appliance as ApplianceKind] ?? row.appliance}</td>
                    <td className="num">{row.orders}</td>
                    <td className="num">{formatTenge(row.turnover)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {expenses.length > 0 && (
          <>
            <h2 className="doc-section">Расходы компании</h2>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "16%" }}>Дата</th>
                  <th style={{ width: "18%" }}>На что</th>
                  <th>Комментарий</th>
                  <th style={{ width: "20%" }}>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((row) => (
                  <tr key={row.id}>
                    <td>{shortDateRu(`${row.spent_on}T12:00:00+05:00`)}</td>
                    <td>{EXPENSE_CATEGORY_LABEL[row.category]}</td>
                    <td>{row.note ?? ""}</td>
                    <td className="num">{formatTenge(row.amount)}</td>
                  </tr>
                ))}
                <tr className="doc-total">
                  <td colSpan={3} className="num">
                    Итого
                  </td>
                  <td className="num">{formatTenge(spent.total)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        <p className="doc-note" style={{ marginTop: "5mm" }}>
          Отчёт сформирован {longDateRu(new Date().toISOString())} в CRM «{company.company_name}».
          Деньги считаются по дню, когда их приняли в кассу, а не по дню заявки.
          Выполненные, но не сданные заявки в деньги периода не входят.
        </p>
      </article>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr className={bold ? "doc-total" : undefined}>
      <td style={{ whiteSpace: "pre" }}>{label}</td>
      <td className="num" style={{ width: "32%" }}>
        {value}
      </td>
    </tr>
  );
}
