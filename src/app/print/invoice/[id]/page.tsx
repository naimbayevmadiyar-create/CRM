import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getInvoice, invoiceTotal, listInvoiceItems } from "@/lib/db/invoices";
import { getCompany, missingForInvoice } from "@/lib/db/company";
import { formatPhone } from "@/lib/format";
import { amountInWords } from "@/lib/amountInWords";
import { docNumber, longDateRu } from "@/lib/docs";
import { BuyerForm } from "./BuyerForm";
import { SignBlock } from "../../SignBlock";
import { PrintBar } from "../../PrintBar";
import "../../print.css";

export const metadata: Metadata = { title: "Счёт на оплату" };

/** Числа в счёте — в бухгалтерском виде: 80 000,00 без значка валюты. */
function money(amount: number): string {
  const whole = Math.trunc(amount);
  const grouped = String(Math.abs(whole)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${whole < 0 ? "−" : ""}${grouped},00`;
}

export default async function InvoicePage({
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

  const total = invoiceTotal(items);
  const number = docNumber(invoice.number, company.contract_prefix);
  // дату можно поставить свою — счёт часто выписывают днём работ
  const issuedOn = longDateRu(invoice.issued_on ?? invoice.created_at);

  return (
    <div className="print-page">
      <PrintBar backHref="/invoices" title={`Счёт на оплату · ${number}`} />

      <article className="sheet">
        {/* Образец платёжного поручения — как в 1С: по нему бухгалтер
            плательщика заполняет платёж, не спрашивая реквизиты заново. */}
        <p className="doc-note" style={{ marginBottom: "1mm" }}>
          Образец платёжного поручения
        </p>

        <table style={{ marginBottom: "4mm" }}>
          <tbody>
            <tr>
              <td style={{ width: "46%" }}>
                Бенефициар:
                <br />
                <b>{company.company_legal_name}</b>
                <br />
                БИН / ИИН: {company.company_bin}
              </td>
              <td style={{ width: "34%" }}>
                ИИК
                <br />
                <b>{company.bank_account}</b>
              </td>
              <td>
                Кбе
                <br />
                <b>{company.bank_kbe}</b>
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
                <b>{company.payment_purpose_code}</b>
              </td>
            </tr>
          </tbody>
        </table>

        <h1 style={{ textAlign: "center", fontSize: "14pt" }}>
          Счёт на оплату № {number} от {issuedOn}
        </h1>

        <p>
          <b>Поставщик:</b> БИН / ИИН {company.company_bin}, {company.company_legal_name}
          {company.company_address ? `, ${company.company_address}` : ""}
          {company.company_phone ? `, тел. ${formatPhone(company.company_phone)}` : ""}
        </p>

        <p style={{ marginTop: "2mm" }}>
          <b>Покупатель:</b>{" "}
          {invoice.buyer_bin ? `БИН / ИИН ${invoice.buyer_bin}, ` : ""}
          {invoice.buyer_name ?? "—"}
          {invoice.buyer_address ? `, ${invoice.buyer_address}` : ""}
        </p>

        <p style={{ marginTop: "2mm" }}>
          <b>Договор:</b>{" "}
          {invoice.contract_number ? `№ ${invoice.contract_number}` : "без договора"}
          {invoice.contract_date ? ` от ${invoice.contract_date}` : ""}
        </p>

        <table>
          <thead>
            <tr>
              <th style={{ width: "7%" }}>№</th>
              <th>Наименование</th>
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
          Всего наименований {items.length}, на сумму <b>{money(total)} KZT</b>
        </p>
        <p>
          <b>Всего к оплате:</b> {amountInWords(total)}
        </p>

        <div className="terms">
          <p>
            Внимание! Оплата данного счёта означает согласие с условиями оказания услуг.
            Услуги оказываются по факту поступления денег на счёт Поставщика. Счёт
            действителен к оплате в течение 5 рабочих дней.
          </p>
        </div>

        <div className="doc-signs">
          <SignBlock
            role="Исполнитель / Бухгалтер"
            name={company.company_legal_name}
            stamp={company.stamp_image}
          />
          <div />
        </div>
      </article>

      <BuyerForm
        invoiceId={invoice.id}
        defaults={{
          buyer_name: invoice.buyer_name,
          buyer_bin: invoice.buyer_bin,
          buyer_address: invoice.buyer_address,
          contract_number: invoice.contract_number,
          issued_on: invoice.issued_on,
        }}
        items={items.map((item) => ({
          title: item.title,
          price: item.price,
          quantity: item.quantity,
        }))}
      />
    </div>
  );
}
