"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { saveBuyer, type BuyerState } from "./actions";

const INITIAL: BuyerState = {};

export function BuyerForm({
  orderId,
  defaults,
}: {
  orderId: string;
  defaults: {
    org_name: string | null;
    org_bin: string | null;
    org_address: string | null;
    contract_number: string | null;
  };
}) {
  const action = saveBuyer.bind(null, orderId);
  const [state, formAction, pending] = useActionState(action, INITIAL);

  return (
    <form
      action={formAction}
      className="no-print mx-auto mt-4 max-w-3xl rounded-[var(--radius-card)]
                 border border-border bg-surface p-5"
    >
      <h2 className="text-lg font-semibold">Реквизиты плательщика</h2>
      <p className="mb-4 mt-1 text-sm text-muted">
        Заполните, если счёт выставляется организации. После сохранения данные
        подставятся в счёт — печатать можно сразу.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Организация"
          name="org_name"
          defaultValue={defaults.org_name ?? ""}
          placeholder="ТОО «…» или ИП «…»"
          required
        />
        <Field
          label="БИН / ИИН"
          name="org_bin"
          inputMode="numeric"
          defaultValue={defaults.org_bin ?? ""}
        />
        <Field
          label="Юридический адрес"
          name="org_address"
          defaultValue={defaults.org_address ?? ""}
        />
        <Field
          label="Номер договора"
          name="contract_number"
          defaultValue={defaults.contract_number ?? ""}
          placeholder="Необязательно"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняем…" : "Сохранить и подставить в счёт"}
        </Button>
        {state.error && (
          <span role="alert" className="text-sm text-danger">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
