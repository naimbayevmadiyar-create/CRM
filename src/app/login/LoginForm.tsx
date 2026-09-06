"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

const INITIAL: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <Field
        label="Пароль"
        name="password"
        type="password"
        autoFocus
        required
        autoComplete="current-password"
      />

      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Проверяем…" : "Войти"}
      </Button>
    </form>
  );
}
