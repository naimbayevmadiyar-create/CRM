import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getOrder } from "@/lib/db/orders";
import { itemsTotal, listOrderItems } from "@/lib/db/orderItems";
import { getCompany } from "@/lib/db/company";
import { APPLIANCE_LABEL } from "@/lib/appliance";
import { formatPhone, formatTenge } from "@/lib/format";
import { PrintBar } from "../../PrintBar";
import "../../print.css";

export const metadata: Metadata = { title: "Заказ-наряд" };

/** На бланке семь строк: заполненные позиции плюс пустые под дозапись. */
const MIN_ROWS = 7;

function Fill({ value, width = "60mm" }: { value?: string | null; width?: string }) {
  return value ? <span>{value}</span> : <span className="fill" style={{ minWidth: width }} />;
}

export default async function WorkOrderPage({
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

  const total = items.length > 0 ? itemsTotal(items) : (order.total_amount ?? 0);
  const emptyRows = Math.max(0, MIN_ROWS - items.length);

  return (
    <div className="print-page">
      <PrintBar backHref="/orders" title={`Заказ-наряд · заявка №${order.number}`} />

      <article className="sheet">
        <header className="flex items-start justify-between gap-6">
          <div>
            <div className="text-[13pt] font-bold">{company.company_name}</div>
            <div className="text-[9pt]">Гарантийный отдел</div>
          </div>
          <div className="text-right">
            <div className="text-[12pt]">
              Заказ № <b>{order.number}</b>
            </div>
            {company.company_phone && (
              <div className="text-[10pt]">тел: {formatPhone(company.company_phone)}</div>
            )}
          </div>
        </header>

        <div className="mt-[4mm] grid grid-cols-2 gap-[6mm]">
          <section>
            <h2>Данные заказчика</h2>
            <p>
              ФИО:{" "}
              <Fill
                value={order.is_legal_entity ? order.org_name : order.client_name}
                width="50mm"
              />
            </p>
            <p>
              Адрес: <Fill value={order.address} width="50mm" />
            </p>
            <p>Телефон: {formatPhone(order.client_phone)}</p>
          </section>

          <section>
            <h2>Данные техники</h2>
            <p>
              Оборудование: {APPLIANCE_LABEL[order.appliance]}
              {order.brand ? `, ${order.brand}` : ""}
              {order.model ? ` ${order.model}` : ""}
            </p>
            <p>
              Заявленная неисправность: <Fill value={order.problem} width="45mm" />
            </p>
            {order.serial_number && <p>Серийный номер: {order.serial_number}</p>}
          </section>
        </div>

        <h2>Заказ-наряд</h2>
        <p className="text-[9pt]">
          Перечень выполняемых работ и комплектующих по прейскуранту
        </p>

        <table>
          <thead>
            <tr>
              <th style={{ width: "7%" }}>№</th>
              <th>Наименование работ, услуг, деталей</th>
              <th style={{ width: "14%" }}>Цена</th>
              <th style={{ width: "10%" }}>Кол-во</th>
              <th style={{ width: "16%" }}>Стоимость</th>
              <th style={{ width: "14%" }}>Гарантия</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.title}</td>
                <td className="num">{formatTenge(item.price)}</td>
                <td className="num">{item.quantity}</td>
                <td className="num">{formatTenge(item.price * item.quantity)}</td>
                <td className="num">{item.warranty_months} мес.</td>
              </tr>
            ))}
            {Array.from({ length: emptyRows }, (_, i) => (
              <tr key={`empty-${i}`}>
                <td>{items.length + i + 1}</td>
                <td>&nbsp;</td>
                <td />
                <td />
                <td />
                <td />
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="num">
                <b>Итого</b>
              </td>
              <td className="num">
                <b>{formatTenge(total)}</b>
              </td>
              <td />
            </tr>
          </tbody>
        </table>

        <div className="terms">
          <h2>Общие условия договора</h2>
          <p>
            Оплата производится после выполнения и приёмки работ. Стоимость ремонта
            определяется по результатам диагностики и согласовывается с Заказчиком до
            начала работ. Срок ремонта — до {company.repair_term_days} календарных дней.
            Гарантия на выполненные работы и установленные детали — до{" "}
            {company.warranty_months} месяцев. Гарантия не действует при вмешательстве
            третьих лиц или нарушении правил эксплуатации техники.
          </p>
        </div>

        <p style={{ marginTop: "4mm" }}>
          Исполнитель: <Fill width="70mm" /> Подпись <Fill width="30mm" />
        </p>

        <h2>Акт сдачи-приёмки выполненных работ</h2>
        <p>
          к договору (Заказу) № <Fill value={String(order.number)} width="20mm" /> от{" "}
          <Fill width="30mm" /> на сумму <Fill value={formatTenge(total)} width="35mm" />
        </p>

        <div className="terms">
          <p>
            Работы и услуги по Договору (Заказу) выполнены полностью и в срок. Заказчик
            претензий по объёму, качеству и срокам выполнения работ не имеет. С условиями
            оказания услуг, а также с прейскурантом заказчик ознакомлен до начала работ.
            Выполненные работы и/или оборудование проверил и принял, претензий не имеет.
          </p>
        </div>

        <p style={{ marginTop: "4mm" }}>
          Заказчик: <Fill width="70mm" /> Подпись <Fill width="30mm" />
        </p>
      </article>
    </div>
  );
}
