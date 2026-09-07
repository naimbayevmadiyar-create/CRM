import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getOrder } from "@/lib/db/orders";
import { getCompany } from "@/lib/db/company";
import { APPLIANCE_LABEL } from "@/lib/appliance";
import { formatPhone, formatTenge } from "@/lib/format";
import { PrintBar } from "../../PrintBar";
import "../../print.css";

export const metadata: Metadata = { title: "Акт приёма-передачи" };

/** Пустая линия под рукописное заполнение, если данных в заявке нет. */
function Fill({ value, width = "60mm" }: { value?: string | null; width?: string }) {
  return value ? (
    <span>{value}</span>
  ) : (
    <span className="fill" style={{ minWidth: width }} />
  );
}

export default async function ActPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [order, company] = await Promise.all([getOrder(id), getCompany()]);
  if (!order) notFound();

  return (
    <div className="print-page">
      <PrintBar backHref="/orders" title={`Акт приёма-передачи · заявка №${order.number}`} />

      <article className="sheet">
        <header className="flex items-start justify-between gap-6">
          <h1>Акт приёма-передачи оборудования в ремонт</h1>
          <div className="text-right text-[10pt] leading-tight">
            <div className="font-bold">{company.company_name}</div>
            {company.company_phone && <div>{formatPhone(company.company_phone)}</div>}
          </div>
        </header>

        <p>
          Приложение к Договору № <Fill value={order.contract_number} width="30mm" /> от{" "}
          <Fill value={order.contract_date} width="30mm" /> г.
        </p>

        <p style={{ marginTop: "3mm" }}>
          Заказчик:{" "}
          <Fill
            value={order.is_legal_entity ? order.org_name : order.client_name}
            width="70mm"
          />
          {"  "}
          Тел.: <Fill value={formatPhone(order.client_phone)} width="40mm" />
        </p>

        {order.is_legal_entity && (
          <p>
            БИН: <Fill value={order.org_bin} width="40mm" />
            {"  "}
            Адрес: <Fill value={order.org_address} width="70mm" />
          </p>
        )}

        <p style={{ marginTop: "3mm" }}>
          Описание неисправности со слов заказчика:{" "}
          <Fill value={order.problem} width="110mm" />
        </p>

        <h2>Перечень оборудования</h2>
        <table>
          <thead>
            <tr>
              <th style={{ width: "22%" }}>Бренд</th>
              <th>Наименование техники</th>
              <th style={{ width: "12%" }}>Кол-во</th>
              <th style={{ width: "26%" }}>Серийный номер</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{order.brand ?? ""}</td>
              <td>
                {APPLIANCE_LABEL[order.appliance]}
                {order.model ? `, ${order.model}` : ""}
              </td>
              <td>1</td>
              <td>{order.serial_number ?? ""}</td>
            </tr>
            {/* пустые строки — если техники было больше одной */}
            <tr>
              <td>&nbsp;</td>
              <td />
              <td />
              <td />
            </tr>
          </tbody>
        </table>

        <p>
          Доп. информация: <Fill width="90mm" />
        </p>

        <div style={{ marginTop: "5mm" }}>
          <p>
            Оборудование передал: <Fill width="70mm" /> Подпись <Fill width="30mm" />
          </p>
          <p style={{ marginTop: "3mm" }}>
            Оборудование принял: <Fill width="70mm" /> Подпись <Fill width="30mm" />
          </p>
        </div>

        <div className="terms">
          <p>
            Стоимость диагностики <b>{formatTenge(company.diagnostics_price)}</b>. По
            результатам диагностики клиент уведомляется о неисправности и стоимости
            ремонта. Ремонт производится только после согласования стоимости с клиентом.
          </p>
          <p>
            После уведомления о готовности техники клиент обязан забрать её в течение{" "}
            <b>3 рабочих дней</b>.
          </p>
          <p style={{ marginTop: "3mm" }}>
            Подписывая настоящий акт, клиент подтверждает ознакомление и согласие с
            указанными условиями.
          </p>
        </div>
      </article>
    </div>
  );
}
