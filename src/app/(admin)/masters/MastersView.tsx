"use client";

import { useActionState, useState } from "react";
import { KeyRound, Pencil, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPhone } from "@/lib/format";
import type { Profile } from "@/lib/db/profiles";
import {
  addMaster,
  changeMasterPassword,
  saveMaster,
  toggleMaster,
  type MasterFormState,
} from "./actions";

const INITIAL: MasterFormState = {};

export function MastersView({
  masters,
  defaultSharePercent,
}: {
  masters: Profile[];
  defaultSharePercent: number;
}) {
  const [addState, addAction, adding] = useActionState(addMaster, INITIAL);

  const withoutPassword = masters.filter((m) => m.is_active && !m.has_password);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Мастера</h1>
        <p className="mt-1 text-muted">
          У каждого свой пароль — по нему система и понимает, кто вошёл. Зайти
          под чужим именем нельзя.
        </p>
      </header>

      {withoutPassword.length > 0 && (
        <p className="flex items-start gap-2 rounded-[var(--radius-card)] border border-warning/40
                      bg-warning/5 p-4 text-sm">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden />
          <span>
            Без пароля не смогут войти: <b>{withoutPassword.map((m) => m.full_name).join(", ")}</b>.
            Задайте каждому свой и передайте лично.
          </span>
        </p>
      )}

      <section>
        {masters.length === 0 ? (
          <EmptyState
            title="Мастеров нет"
            hint="Добавьте первого и задайте ему пароль — с ним он и будет входить."
          />
        ) : (
          <ul className="space-y-2">
            {masters.map((master) => (
              <MasterRow
                key={master.id}
                master={master}
                defaultSharePercent={defaultSharePercent}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">Добавить мастера</h2>
        <form action={addAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Имя" name="full_name" placeholder="Валихан" required />
          <Field label="Телефон" name="phone" type="tel" placeholder="Необязательно" />
          <Field
            label="Пароль"
            name="password"
            type="text"
            autoComplete="off"
            placeholder="Минимум 6 символов"
          />
          <Field
            label={`Доля компании, % (по умолчанию ${defaultSharePercent})`}
            name="share_percent"
            type="number"
            min={0}
            max={100}
            placeholder="Например, 40"
          />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={adding}>
              {adding ? "Добавляем…" : "Добавить"}
            </Button>
          </div>
          {addState.error && (
            <p role="alert" className="text-sm text-danger sm:col-span-2">
              {addState.error}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}

function MasterRow({
  master,
  defaultSharePercent,
}: {
  master: Profile;
  defaultSharePercent: number;
}) {
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(master.is_active);
  const [editing, setEditing] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const [saveState, saveAction, saving] = useActionState(saveMaster, INITIAL);
  const [passState, passAction, changing] = useActionState(changeMasterPassword, INITIAL);

  async function onToggle() {
    setBusy(true);
    const next = !active;
    setActive(next);
    const result = await toggleMaster(master.id, next);
    if ("error" in result && result.error) setActive(!next);
    setBusy(false);
  }

  return (
    <li className="rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{master.full_name}</p>
          <p className="text-sm text-muted">
            {master.phone ? formatPhone(master.phone) : "телефон не указан"} ·{" "}
            доля компании {master.share_percent ?? defaultSharePercent} %
            {master.share_percent == null && " (общая)"}
          </p>
        </div>

        {!master.has_password && (
          <span className="rounded-full bg-warning/12 px-2.5 py-1 text-xs font-medium text-warning">
            Без пароля
          </span>
        )}

        <span className={active ? "text-sm text-success" : "text-sm text-muted"}>
          {active ? "Работает" : "Отключён"}
        </span>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setEditing((v) => !v)}
            aria-expanded={editing}
          >
            <Pencil size={15} aria-hidden />
            Изменить
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPasswordOpen((v) => !v)}
            aria-expanded={passwordOpen}
          >
            <KeyRound size={15} aria-hidden />
            Пароль
          </Button>
          <Button type="button" variant="ghost" onClick={onToggle} disabled={busy}>
            {active ? "Отключить" : "Включить"}
          </Button>
        </div>
      </div>

      {editing && (
        <form action={saveAction} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_10rem_auto] sm:items-end">
          <input type="hidden" name="id" value={master.id} />
          <Field label="Имя" name="full_name" defaultValue={master.full_name} required />
          <Field
            label="Телефон"
            name="phone"
            type="tel"
            defaultValue={master.phone ?? ""}
          />
          <Field
            label="Доля компании, %"
            name="share_percent"
            type="number"
            min={0}
            max={100}
            defaultValue={master.share_percent ?? ""}
            placeholder={String(defaultSharePercent)}
          />
          <Button type="submit" disabled={saving}>
            {saving ? "Сохраняем…" : "Сохранить"}
          </Button>
          {saveState.error && (
            <p role="alert" className="text-sm text-danger sm:col-span-4">
              {saveState.error}
            </p>
          )}
          {saveState.ok && (
            <p className="text-sm text-success sm:col-span-4">Сохранено</p>
          )}
        </form>
      )}

      {passwordOpen && (
        <form action={passAction} className="mt-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={master.id} />
          <Field
            label={master.has_password ? "Новый пароль" : "Пароль"}
            name="password"
            type="text"
            autoComplete="off"
            placeholder="Минимум 6 символов"
            className="w-64"
          />
          <Button type="submit" disabled={changing}>
            {changing ? "Меняем…" : "Задать"}
          </Button>
          <p className="w-full text-xs text-muted">
            {master.has_password
              ? "Старый пароль перестанет работать сразу, этого мастера выкинет из системы."
              : "Передайте пароль лично — входить он будет только им."}
          </p>
          {passState.error && (
            <p role="alert" className="w-full text-sm text-danger">
              {passState.error}
            </p>
          )}
          {passState.ok && <p className="w-full text-sm text-success">Пароль задан</p>}
        </form>
      )}
    </li>
  );
}
