import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getInvoice, invoiceTotal, listInvoiceItems } from "@/lib/db/invoices";
import { getCompany } from "@/lib/db/company";
import { formatPhone } from "@/lib/format";
import { amountInWords } from "@/lib/amountInWords";
import { docNumber, longDateRu } from "@/lib/docs";
import { PrintBar } from "../../PrintBar";
import "../../print.css";

export const metadata: Metadata = { title: "АВР" };

/**
 * Акт выполненных работ к счёту.
 *
 * Юрлицу мало счёта: бухгалтерия закрывает оплату актом, иначе расход
 * не проведёшь. Поэтому АВР формируется из того же счёта — те же строки,
 * тот же номер, те же реквизиты.
 */
function money(amount: number): string {
  const whole = Math.trunc(amount);
  const grouped = String(Math.abs(whole)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped},00`;
}

export default async function AvrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [invoice, items, company] = await Promise.all([
    getInvoice(id),
    listInvoiceItems(id),
    getCompany(),
  ]);
  if (!invoice) notFound();

  const total = invoiceTotal(items);
  const number = docNumber(invoice.number, company.contract_prefix);
  const date = longDateRu(invoice.created_at);

  return (
    <div className="print-page">
      <PrintBar backHref="/invoices" title={`АВР · ${number}`} />

      <article className="sheet">
        <h1 style={{ textAlign: "center", fontSize: "13pt" }}>
          Акт выполненных работ (оказанных услуг) № {number}
        </h1>
        <p style={{ textAlign: "center" }}>от {date}</p>

        <p style={{ marginTop: "4mm" }}>
          <b>Исполнитель:</b> БИН / ИИН {company.company_bin}, {company.company_legal_name}
          {company.company_address ? `, ${company.company_address}` : ""}
          {company.company_phone ? `, тел. ${formatPhone(company.company_phone)}` : ""}
        </p>

        <p style={{ marginTop: "2mm" }}>
          <b>Заказчик:</b> {invoice.buyer_bin ? `БИН / ИИН ${invoice.buyer_bin}, ` : ""}
          {invoice.buyer_name ?? "—"}
          {invoice.buyer_address ? `, ${invoice.buyer_address}` : ""}
        </p>

        <p style={{ marginTop: "2mm" }}>
          <b>Основание:</b>{" "}
          {invoice.contract_number
            ? `договор № ${invoice.contract_number}`
            : `счёт на оплату № ${number}`}
        </p>

        <table>
          <thead>
            <tr>
              <th style={{ width: "7%" }}>№</th>
              <th>Наименование работ (услуг)</th>
              <th style={{ width: "11%" }}>Кол-во</th>
              <th style={{ width: "9%" }}>Ед.</th>
              <th style={{ width: "16%" }}>Цена</th>
              <th style={{ width: "18%" }}>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.title}</td>
                <td className="num">{item.quantity}</td>
                <td>{item.unit}</td>
                <td className="num">{money(item.price)}</td>
                <td className="num">{money(item.price * item.quantity)}</td>
              </tr>
            ))}
            <tr className="doc-total">
              <td colSpan={5} className="num">
                Итого
              </td>
              <td className="num">{money(total)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="num">
                В том числе НДС
              </td>
              <td className="num">Без НДС</td>
            </tr>
          </tbody>
        </table>

        <p>
          Всего оказано услуг на сумму <b>{amountInWords(total)}</b>
        </p>

        <div className="terms">
          <p>
            Работы (услуги) выполнены полностью и в срок. Заказчик претензий по объёму,
            качеству и срокам оказания услуг не имеет.
          </p>
        </div>

        <div className="doc-cols" style={{ marginTop: "8mm" }}>
          <section className="doc-signer">
            <p>
              <b>Исполнитель</b>
            </p>
            <p style={{ marginTop: "6mm" }}>
              {company.company_legal_name} <span className="fill" style={{ minWidth: "35mm" }} />
            </p>
            <span className="doc-marks" style={{ left: "20mm", top: "8mm" }}>
              {company.stamp_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.stamp_image} alt="" className="doc-stamp" />
              )}
            </span>
          </section>

          <section>
            <p>
              <b>Заказчик</b>
            </p>
            <p style={{ marginTop: "6mm" }}>
              {invoice.buyer_name ?? ""} <span className="fill" style={{ minWidth: "35mm" }} />
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
