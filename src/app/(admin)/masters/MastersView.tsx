"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPhone } from "@/lib/format";
import type { Profile } from "@/lib/db/profiles";
import {
  addMaster,
  rotateMasterPassword,
  toggleMaster,
  type MasterFormState,
  type RotateState,
} from "./actions";

const ADD_INITIAL: MasterFormState = {};
const ROTATE_INITIAL: RotateState = {};

export function MastersView({ masters }: { masters: Profile[] }) {
  const [addState, addAction, adding] = useActionState(addMaster, ADD_INITIAL);
  const [rotateState, rotateAction, rotating] = useActionState(
    rotateMasterPassword,
    ROTATE_INITIAL,
  );
  const [copied, setCopied] = useState(false);

  async function copyHash(hash: string) {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Мастера</h1>
        <p className="mt-1 text-muted">
          Мастер выбирает своё имя на входе. Отключённые в списке не показываются.
        </p>
      </header>

      <section>
        {masters.length === 0 ? (
          <EmptyState title="Мастеров нет" hint="Добавьте первого — он появится на экране входа." />
        ) : (
          <ul className="space-y-2">
            {masters.map((master) => (
              <MasterRow key={master.id} master={master} />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">Добавить мастера</h2>
        <form action={addAction} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Имя" name="full_name" placeholder="Валихан" required />
          <Field label="Телефон" name="phone" type="tel" placeholder="Необязательно" />
          <Button type="submit" disabled={adding} className="sm:mb-0">
            {adding ? "Добавляем…" : "Добавить"}
          </Button>
          {addState.error && (
            <p role="alert" className="text-sm text-danger sm:col-span-3">
              {addState.error}
            </p>
          )}
        </form>
      </section>

      <section className="rounded-[var(--radius-card)] border border-warning/40 bg-surface p-5">
        <div className="mb-3 flex items-start gap-2">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warning" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold">Сменить пароль мастеров</h2>
            <p className="mt-1 text-sm text-muted">
              Все мастера выйдут немедленно и должны будут ввести новый пароль
              и заново выбрать имя. Делайте это, когда кто-то уволился.
            </p>
          </div>
        </div>

        <form action={rotateAction} className="flex flex-wrap items-end gap-3">
          <Field
            label="Новый пароль"
            name="password"
            type="text"
            autoComplete="off"
            placeholder="Минимум 6 символов"
            className="w-64"
          />
          <Button type="submit" variant="danger" disabled={rotating}>
            {rotating ? "Меняем…" : "Сменить"}
          </Button>
        </form>

        {rotateState.error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {rotateState.error}
          </p>
        )}

        {rotateState.hash && (
          <div className="mt-4 rounded-[var(--radius-card)] bg-surface2 p-4">
            <p className="mb-2 text-sm">
              Пароль сменён, версия {rotateState.version}. Осталось положить новый хеш
              в переменную <code className="font-mono">MASTER_PASSWORD_HASH</code> на Vercel
              и передеплоить — иначе новый пароль не подойдёт.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-surface px-3 py-2 font-mono text-xs">
                {rotateState.hash}
              </code>
              <Button
                type="button"
                variant="ghost"
                onClick={() => copyHash(rotateState.hash!)}
                aria-label="Скопировать хеш"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Скопировано" : "Копировать"}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function MasterRow({ master }: { master: Profile }) {
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(master.is_active);

  async function onToggle() {
    setBusy(true);
    const next = !active;
    setActive(next);
    const result = await toggleMaster(master.id, next);
    if ("error" in result && result.error) setActive(!next);
    setBusy(false);
  }

  return (
    <li className="flex items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{master.full_name}</p>
        {master.phone && <p className="text-sm text-muted">{formatPhone(master.phone)}</p>}
      </div>

      <span className={active ? "text-sm text-success" : "text-sm text-muted"}>
        {active ? "Работает" : "Отключён"}
      </span>

      <Button type="button" variant="ghost" onClick={onToggle} disabled={busy}>
        {active ? "Отключить" : "Включить"}
      </Button>
    </li>
  );
}
