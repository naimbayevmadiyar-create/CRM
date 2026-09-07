import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getOrder } from "@/lib/db/orders";
import { itemsTotal, listOrderItems } from "@/lib/db/orderItems";
import { getCompany, missingForInvoice } from "@/lib/db/company";
import { APPLIANCE_LABEL } from "@/lib/appliance";
import { formatDateTime, formatPhone, formatTenge } from "@/lib/format";
import { amountInWords } from "@/lib/amountInWords";
import { PrintBar } from "../../PrintBar";
import "../../print.css";

export const metadata: Metadata = { title: "Счёт на оплату" };

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [order, items, company] = await Promise.all([
    getOrder(id),
    listOrderItems(id),
    getCompany(),
  ]);
  if (!order) notFound();

  const gaps = missingForInvoice(company);

  // Без реквизитов счёт печатать нельзя — он будет недействительным
  if (gaps.length > 0) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <h1 className="text-2xl font-semibold">Счёт пока не сформировать</h1>
        <p className="mt-2 text-muted">
          В настройках не заполнено: {gaps.join(", ")}. Без этих данных счёт
          недействителен — банк не примет оплату.
        </p>
        <Link
          href="/settings"
          className="mt-6 inline-flex h-12 items-center rounded-[var(--radius-card)]
                     bg-primary px-5 font-medium text-primaryink"
        >
          Заполнить реквизиты
        </Link>
      </div>
    );
  }

  const rows =
    items.length > 0
      ? items
      : [
          {
            id: "single",
            title: `Ремонт: ${APPLIANCE_LABEL[order.appliance]}`,
            price: order.total_amount ?? 0,
            quantity: 1,
          },
        ];

  const total = items.length > 0 ? itemsTotal(items) : (order.total_amount ?? 0);

  return (
    <div className="print-page">
      <PrintBar backHref="/orders" title={`Счёт · заявка №${order.number}`} />

      <article className="sheet">
        <table style={{ marginBottom: "4mm" }}>
          <tbody>
            <tr>
              <td style={{ width: "32%" }}>
                Бенефициар:
                <br />
                <b>{company.company_legal_name}</b>
                <br />
                БИН: {company.company_bin}
              </td>
              <td>
                ИИК
                <br />
                <b>{company.bank_account}</b>
              </td>
              <td style={{ width: "26%" }}>
                Кбе
                <br />
                17
              </td>
            </tr>
            <tr>
              <td>
                Банк бенефициара:
                <br />
                <b>{company.bank_name}</b>
              </td>
              <td>
                БИК
                <br />
                <b>{company.bank_bic}</b>
              </td>
              <td>
                Код назначения платежа
                <br />
                859
              </td>
            </tr>
          </tbody>
        </table>

        <h1>
          Счёт на оплату № {order.number} от {formatDateTime(order.created_at)}
        </h1>

        <p>
          <b>Поставщик:</b> {company.company_legal_name}
          {company.company_bin ? `, БИН ${company.company_bin}` : ""}
          {company.company_address ? `, ${company.company_address}` : ""}
          {company.company_phone ? `, тел. ${formatPhone(company.company_phone)}` : ""}
        </p>

        <p style={{ marginTop: "2mm" }}>
          <b>Покупатель:</b>{" "}
          {order.org_name ?? order.client_name ?? "—"}
          {order.org_bin ? `, БИН ${order.org_bin}` : ""}
          {order.org_address ? `, ${order.org_address}` : ""}
        </p>

        <p style={{ marginTop: "2mm" }}>
          <b>Договор:</b> {order.contract_number ? `№ ${order.contract_number}` : "по заявке"}{" "}
          {order.contract_date ?? ""}
        </p>

        <table>
          <thead>
            <tr>
              <th style={{ width: "7%" }}>№</th>
              <th>Наименование</th>
              <th style={{ width: "10%" }}>Кол-во</th>
              <th style={{ width: "16%" }}>Цена</th>
              <th style={{ width: "18%" }}>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td>{row.title}</td>
                <td className="num">{row.quantity}</td>
                <td className="num">{formatTenge(row.price)}</td>
                <td className="num">{formatTenge(row.price * row.quantity)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="num">
                <b>Итого</b>
              </td>
              <td className="num">
                <b>{formatTenge(total)}</b>
              </td>
            </tr>
          </tbody>
        </table>

        <p>
          Всего наименований {rows.length}, на сумму <b>{formatTenge(total)}</b>
        </p>
        <p>
          <b>Всего к оплате:</b> {amountInWords(total)}
        </p>
        <p className="text-[9.5pt]">Без НДС.</p>

        <div className="terms">
          <p>
            Оплата данного счёта означает согласие с условиями оказания услуг. Товар
            отпускается по факту оплаты, при наличии доверенности и документа,
            удостоверяющего личность.
          </p>
        </div>

        <div className="sign">
          <span>
            Исполнитель <span className="fill" style={{ minWidth: "50mm" }} />
          </span>
          <span>М.П.</span>
        </div>
      </article>
    </div>
  );
}
