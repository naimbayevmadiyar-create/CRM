"use client";

import { useActionState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import type { Company } from "@/lib/db/company";
import { saveSettings, type SettingsState } from "./actions";

const INITIAL: SettingsState = {};

export function SettingsView({
  company,
  invoiceGaps,
}: {
  company: Company;
  invoiceGaps: string[];
}) {
  const [state, action, pending] = useActionState(saveSettings, INITIAL);

  return (
    <form action={action} className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Настройки</h1>
        <p className="mt-1 text-muted">
          Эти данные подставляются в акт, заказ-наряд и счёт. Заполните один раз.
        </p>
      </header>

      {invoiceGaps.length > 0 && (
        <div className="flex items-start gap-2 rounded-[var(--radius-card)] border border-warning/40 bg-surface p-4">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warning" aria-hidden />
          <p className="text-sm">
            Счёт для юрлиц пока не печатается: не заполнено{" "}
            <b>{invoiceGaps.join(", ")}</b>. Акт и заказ-наряд работают и без этого.
          </p>
        </div>
      )}

      <Section title="Компания">
        <Field
          label="Как называть в документах"
          name="company_name"
          defaultValue={company.company_name}
          required
        />
        <Field
          label="Полное наименование"
          name="company_legal_name"
          defaultValue={company.company_legal_name ?? ""}
          placeholder="ИП «Честный сервис» или ТОО «…»"
        />
        <Field
          label="БИН"
          name="company_bin"
          inputMode="numeric"
          defaultValue={company.company_bin ?? ""}
          placeholder="12 цифр"
        />
        <Field
          label="Адрес"
          name="company_address"
          defaultValue={company.company_address ?? ""}
          placeholder="г. Астана, проспект Республики, 58/2"
        />
        <Field
          label="Телефон в документах"
          name="company_phone"
          type="tel"
          defaultValue={company.company_phone ?? ""}
          placeholder="+7 708 024 62 36"
        />
      </Section>

      <Section title="Банк — нужен для счёта юрлицам">
        <Field
          label="Банк"
          name="bank_name"
          defaultValue={company.bank_name ?? ""}
          placeholder="АО «Kaspi Bank»"
        />
        <Field
          label="Счёт IBAN"
          name="bank_account"
          defaultValue={company.bank_account ?? ""}
          placeholder="KZ00 0000 0000 0000 0000"
        />
        <Field
          label="БИК"
          name="bank_bic"
          defaultValue={company.bank_bic ?? ""}
          placeholder="CASPKZKA"
        />
      </Section>

      <Section title="Условия работы">
        <Field
          label="Стоимость диагностики, ₸"
          name="diagnostics_price"
          inputMode="numeric"
          defaultValue={String(company.diagnostics_price)}
        />
        <Field
          label="Гарантия, месяцев"
          name="warranty_months"
          inputMode="numeric"
          defaultValue={String(company.warranty_months)}
        />
        <Field
          label="Срок ремонта, дней"
          name="repair_term_days"
          inputMode="numeric"
          defaultValue={String(company.repair_term_days)}
        />
      </Section>

      <Section title="Расчёт с мастерами">
        <div className="sm:col-span-2">
          <Field
            label="Доля компании от чистых по умолчанию, %"
            name="default_company_share_percent"
            inputMode="numeric"
            defaultValue={String(company.default_company_share_percent)}
            className="max-w-40"
          />
          <p className="mt-1.5 text-sm text-muted">
            Подставляется при закрытии заказа. Мастер может изменить её для
            конкретной заявки, если договорились иначе.
          </p>
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняем…" : "Сохранить"}
        </Button>
        {state.ok && (
          <span className="inline-flex items-center gap-1.5 text-sm text-success">
            <Check size={16} aria-hidden />
            Сохранено
          </span>
        )}
        {state.error && (
          <span role="alert" className="text-sm text-danger">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
