"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextArea } from "@/components/ui/Field";
import { APPLIANCES, APPLIANCE_LABEL } from "@/lib/appliance";
import { isoToLocalInput } from "@/lib/format";
import type { Order } from "@/lib/db/orders";
import { updateOrderAction, type OrderFormState } from "./actions";

const INITIAL: OrderFormState = {};

/**
 * Правка уже созданной заявки.
 *
 * Раньше после создания менялся только мастер: телефон записали с ошибкой —
 * и всё, заводи заново. Деньги здесь не трогаются: их пишет мастер в отчёте.
 */
export function OrderEditForm({
  order,
  onDone,
}: {
  order: Order;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(updateOrderAction, INITIAL);
  const [atServiceCenter, setAtServiceCenter] = useState(order.at_service_center);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form
      action={action}
      className="mt-3 grid gap-3 rounded-[var(--radius-card)] bg-surface2 p-4 sm:grid-cols-2"
    >
      <input type="hidden" name="id" value={order.id} />

      <Field
        label="Телефон клиента"
        name="client_phone"
        type="tel"
        defaultValue={order.client_phone}
        required
      />
      <Field label="Имя" name="client_name" defaultValue={order.client_name ?? ""} />

      {!atServiceCenter && (
        <Field label="Адрес" name="address" defaultValue={order.address ?? ""} />
      )}

      <label className="flex items-center gap-2.5 sm:col-span-2">
        <input
          type="checkbox"
          name="at_service_center"
          checked={atServiceCenter}
          onChange={(e) => setAtServiceCenter(e.target.checked)}
          className="h-5 w-5 accent-[var(--primary)]"
        />
        <span>Технику принесли в сервисный центр</span>
      </label>

      <Select label="Техника" name="appliance" defaultValue={order.appliance}>
        {APPLIANCES.map((a) => (
          <option key={a} value={a}>
            {APPLIANCE_LABEL[a]}
          </option>
        ))}
      </Select>

      <Field
        label={atServiceCenter ? "Когда принесут" : "Когда выехать"}
        name="scheduled_at"
        type="datetime-local"
        defaultValue={order.scheduled_at ? isoToLocalInput(order.scheduled_at) : ""}
      />

      <Field label="Бренд" name="brand" defaultValue={order.brand ?? ""} />
      <Field label="Модель" name="model" defaultValue={order.model ?? ""} />
      <Field
        label="Серийный номер"
        name="serial_number"
        defaultValue={order.serial_number ?? ""}
      />

      <div className="sm:col-span-2">
        <TextArea label="Что случилось" name="problem" defaultValue={order.problem ?? ""} />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {state.error}
        </p>
      )}

      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняем…" : "Сохранить"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
