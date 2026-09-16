"use client";

import { useActionState } from "react";
import { Check, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { changeAdminPassword, type PasswordState } from "./passwordActions";

const INITIAL: PasswordState = {};

export function PasswordForm() {
  const [state, action, pending] = useActionState(changeAdminPassword, INITIAL);

  return (
    <section className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <div className="mb-4 flex items-start gap-2">
        <KeyRound size={20} className="mt-0.5 shrink-0 text-muted" aria-hidden />
        <div>
          <h2 className="text-lg font-semibold">Пароль директора</h2>
          <p className="mt-1 text-sm text-muted">
            Это ваш пароль от админки. После смены все прежние входы на других
            устройствах перестанут работать, а здесь вы останетесь в системе.
            Пароли мастеров меняются в разделе «Мастера».
          </p>
        </div>
      </div>

      <form action={action} className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Текущий пароль"
          name="current"
          type="password"
          autoComplete="current-password"
          required
        />
        <Field
          label="Новый пароль"
          name="next"
          type="password"
          autoComplete="new-password"
          placeholder="Минимум 8 символов"
          required
        />
        <Field
          label="Повторите новый"
          name="repeat"
          type="password"
          autoComplete="new-password"
          required
        />

        <div className="flex items-center gap-3 sm:col-span-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Меняем…" : "Сменить пароль"}
          </Button>
          {state.ok && (
            <span className="inline-flex items-center gap-1.5 text-sm text-success">
              <Check size={16} aria-hidden />
              Пароль сменён
            </span>
          )}
          {state.error && (
            <span role="alert" className="text-sm text-danger">
              {state.error}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
