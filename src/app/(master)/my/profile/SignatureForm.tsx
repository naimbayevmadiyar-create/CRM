"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { ImageField } from "@/components/ImageField";
import { saveSignature, type ActionResult } from "../actions";

const INITIAL: ActionResult = {};

export function SignatureForm({ value }: { value: string | null }) {
  const [state, action, pending] = useActionState(saveSignature, INITIAL);

  return (
    <form
      action={action}
      className="rounded-[var(--radius-card)] border border-border bg-surface p-5"
    >
      <div className="grid gap-4">
        <ImageField
          label="Электронная подпись"
          name="signature"
          value={value}
          height="h-16"
          hint="Распишитесь на белом листе, сфотографируйте и загрузите. Подпись встанет в ваши акты и заказ-наряды."
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняем…" : "Сохранить"}
        </Button>
        {state.ok && <span className="text-sm text-success">Сохранено</span>}
        {state.error && (
          <span role="alert" className="text-sm text-danger">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
