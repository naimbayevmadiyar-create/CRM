import type { Metadata } from "next";
import { getMasterSignature, getProfile } from "@/lib/db/profiles";
import { getCompany } from "@/lib/db/company";
import { APPLIANCE_LABEL } from "@/lib/appliance";
import { formatPhone, formatTenge } from "@/lib/format";
import { contractDate, docNumber } from "@/lib/docs";
import { DocHeader } from "../../DocHeader";
import { SignBlock } from "../../SignBlock";
import { orderForPrint } from "../../access";
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
  const { id } = await params;
  const { order, backHref } = await orderForPrint(id);

  const company = await getCompany();

  // Технику принимает назначенный мастер — подставляем его, а не пустую линию
  const master = order.master_id ? await getProfile(order.master_id) : null;
  const signature = order.master_id ? await getMasterSignature(order.master_id) : null;

  const number = docNumber(order.number, company.contract_prefix);
  const date = contractDate(order.contract_date, order.created_at);

  return (
    <div className="print-page">
      <PrintBar backHref={backHref} title={`Акт приёма-передачи · ${number}`} />

      <article className="sheet">
        <DocHeader
          company={company}
          subtitle="Приём техники в ремонт"
          title="Акт"
          number={number}
          date={date}
        />

        <h1 style={{ marginTop: "5mm" }}>Акт приёма-передачи оборудования в ремонт</h1>

        <p>
          Приложение к Договору № <b>{number}</b> от {date} г.
        </p>

        {/* Имя клиента подставляем из заявки: мастер уточняет его на месте,
            и в акте оно должно стоять. Пусто — останется линия под запись. */}
        <p style={{ marginTop: "3mm" }}>
          Заказчик:{" "}
          <Fill value={order.is_legal_entity ? order.org_name : order.client_name} width="70mm" />
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
            {/* пустая строка — если техники было больше одной */}
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

        <div className="doc-signs">
          <SignBlock
            role="Оборудование передал"
            name={order.is_legal_entity ? order.org_name : order.client_name}
          />
          <SignBlock
            role="Оборудование принял"
            name={master?.full_name}
            signature={signature}
            stamp={company.stamp_image}
          />
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
