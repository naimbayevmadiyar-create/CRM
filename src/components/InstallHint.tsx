"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, Share, X } from "lucide-react";

const DISMISSED_KEY = "cs_install_hint_dismissed";

type InstallEvent = Event & { prompt: () => Promise<void> };
type Mode = "none" | "ios" | "prompt";

/*
  Возможность установки — это состояние среды, а не React.
  Держим его во внешнем хранилище и читаем через useSyncExternalStore:
  так не приходится вызывать setState прямо в эффекте и плодить лишние
  перерисовки при первом кадре.
*/
let mode: Mode = "none";
let deferred: InstallEvent | null = null;
let started = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function start() {
  if (started) return;
  started = true;

  // уже установлено — предлагать нечего
  const installed =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (installed) return;

  // На iOS программной установки нет: Safari требует, чтобы человек сам
  // нажал «Поделиться → На экран Домой». Поэтому там показываем инструкцию.
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
    mode = "ios";
    emit();
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallEvent;
    mode = "prompt";
    emit();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = (): Mode => mode;
const getServerSnapshot = (): Mode => "none";

export function InstallHint() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);

  const hiddenBefore = (() => {
    try {
      return Boolean(localStorage.getItem(DISMISSED_KEY));
    } catch {
      return false;
    }
  })();

  if (state === "none" || dismissed || hiddenBefore) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // приватный режим — покажем ещё раз, невелика беда
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    dismiss();
  }

  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-primary/30 bg-primary/5 p-4">
      <Download size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden />

      <div className="min-w-0 flex-1">
        <p className="font-medium">Поставьте на телефон</p>

        {state === "ios" ? (
          <p className="mt-1 text-sm text-muted">
            Нажмите <Share size={13} className="inline align-[-2px]" aria-hidden />{" "}
            внизу экрана и выберите «На экран Домой». Дальше заявки будут
            открываться иконкой, без браузера.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              Появится иконка, и заявки будут открываться без браузера — как
              обычное приложение.
            </p>
            <button
              type="button"
              onClick={install}
              className="mt-3 h-11 rounded-[var(--radius-card)] bg-primary px-4
                         font-medium text-primaryink active:scale-[0.98]"
            >
              Установить
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Скрыть подсказку"
        className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center
                   rounded-full text-muted"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
