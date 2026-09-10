import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getOrder } from "@/lib/db/orders";
import { getProfile } from "@/lib/db/profiles";
import { itemsTotal, listOrderItems } from "@/lib/db/orderItems";
import { getCompany } from "@/lib/db/company";
import { APPLIANCE_LABEL } from "@/lib/appliance";
import { formatDateTime, formatPhone, formatTenge } from "@/lib/format";
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

  // Исполнитель в документе — назначенный мастер, а не пустая линия
  const master = order.master_id ? await getProfile(order.master_id) : null;

  const total = items.length > 0 ? itemsTotal(items) : (order.total_amount ?? 0);
  const emptyRows = Math.max(0, MIN_ROWS - items.length);

  return (
    <div className="print-page">
      <PrintBar backHref="/orders" title={`Заказ-наряд · заявка №${order.number}`} />

      <article className="sheet">
        <header className="doc-head">
          <div className="doc-brand">
            <Image src="/icon-192.png" alt="" width={40} height={40} className="doc-logo" />
            <div>
              <div className="doc-name">{company.company_name}</div>
              <div className="doc-sub">Гарантийный отдел</div>
            </div>
          </div>

          <div className="doc-meta">
            <div className="doc-number">
              Заказ № <b>{order.number}</b>
            </div>
            <div className="doc-sub">от {formatDateTime(order.created_at)}</div>
            {company.company_phone && (
              <div className="doc-sub">тел. {formatPhone(company.company_phone)}</div>
            )}
          </div>
        </header>

        <div className="doc-cols">
          <section className="doc-box">
            <h2>Данные заказчика</h2>
            <p>
              <span className="doc-label">ФИО</span>
              <Fill
                value={order.is_legal_entity ? order.org_name : order.client_name}
                width="45mm"
              />
            </p>
            <p>
              <span className="doc-label">Адрес</span>
              <Fill value={order.address} width="45mm" />
            </p>
            <p>
              <span className="doc-label">Телефон</span>
              {formatPhone(order.client_phone)}
            </p>
          </section>

          <section className="doc-box">
            <h2>Данные техники</h2>
            <p>
              <span className="doc-label">Оборудование</span>
              {APPLIANCE_LABEL[order.appliance]}
              {order.brand ? `, ${order.brand}` : ""}
              {order.model ? ` ${order.model}` : ""}
            </p>
            <p>
              <span className="doc-label">Неисправность</span>
              <Fill value={order.problem} width="40mm" />
            </p>
            <p>
              <span className="doc-label">Серийный №</span>
              <Fill value={order.serial_number} width="40mm" />
            </p>
          </section>
        </div>

        <h2 className="doc-section">Заказ-наряд</h2>
        <p className="doc-note">
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
            <tr className="doc-total">
              <td colSpan={4} className="num">
                Итого
              </td>
              <td className="num">{formatTenge(total)}</td>
              <td />
            </tr>
          </tbody>
        </table>

        <section className="doc-terms">
          <h2>Общие условия договора</h2>
          <p>
            Оплата производится после выполнения и приёмки работ. Стоимость ремонта
            определяется по результатам диагностики и согласовывается с Заказчиком до
            начала работ. Срок ремонта — до {company.repair_term_days} календарных дней.
            Гарантия на выполненные работы и установленные детали — до{" "}
            {company.warranty_months} месяцев. Гарантия не действует при вмешательстве
            третьих лиц или нарушении правил эксплуатации техники.
          </p>
        </section>

        <div className="doc-sign">
          <span>
            Исполнитель: <Fill value={master?.full_name} width="55mm" />
          </span>
          <span>
            Подпись <span className="fill" style={{ minWidth: "30mm" }} />
          </span>
        </div>

        <h2 className="doc-section">Акт сдачи-приёмки выполненных работ</h2>
        <p className="doc-note">
          к договору (Заказу) № <b>{order.number}</b> от{" "}
          <Fill value={formatDateTime(order.created_at)} width="35mm" /> на сумму{" "}
          <b>{formatTenge(total)}</b>
        </p>

        <section className="doc-terms">
          <p>
            Работы и услуги по Договору (Заказу) выполнены полностью и в срок. Заказчик
            претензий по объёму, качеству и срокам выполнения работ не имеет. С условиями
            оказания услуг, а также с прейскурантом заказчик ознакомлен до начала работ.
            Выполненные работы и/или оборудование проверил и принял, претензий не имеет.
          </p>
        </section>

        <div className="doc-sign">
          <span>
            Заказчик: <Fill
              value={order.is_legal_entity ? order.org_name : order.client_name}
              width="55mm"
            />
          </span>
          <span>
            Подпись <span className="fill" style={{ minWidth: "30mm" }} />
          </span>
        </div>
      </article>
    </div>
  );
}
