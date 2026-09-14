import { formatPhone } from "@/lib/format";
import type { Company } from "@/lib/db/company";

/**
 * Шапка бланка: логотип, название, номер и дата.
 *
 * Одна на все документы — акт, заказ-наряд, счёт и АВР должны выглядеть
 * как бумаги одной компании, а не как четыре разные распечатки.
 */
export function DocHeader({
  company,
  subtitle,
  title,
  number,
  date,
}: {
  company: Company;
  subtitle?: string;
  title: string;
  number: string;
  date: string;
}) {
  return (
    <header className="doc-head">
      <div className="doc-brand">
        {company.logo_image ? (
          // логотип лежит строкой в настройках, поэтому обычный img, не next/image
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logo_image} alt="" className="doc-logo" />
        ) : null}
        <div>
          <div className="doc-name">{company.company_name}</div>
          {subtitle && <div className="doc-sub">{subtitle}</div>}
          {company.company_phone && (
            <div className="doc-sub">тел. {formatPhone(company.company_phone)}</div>
          )}
        </div>
      </div>

      <div className="doc-meta">
        <div className="doc-number">
          {title} № <b>{number}</b>
        </div>
        <div className="doc-sub">от {date}</div>
      </div>
    </header>
  );
}
