"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Экран ошибки вместо стандартного «A server error occurred».
 * Мастер должен понимать, что делать, а не читать английский текст
 * про сервер. Техническая подробность — только код: по нему ошибка
 * находится в журнале (Настройки → Журнал ошибок).
 */

/*
  Самая частая «ошибка иногда» — не поломка, а обновление. Страница на телефоне
  открыта со старой версии, после выкладки новой её кнопки ведут в пустоту.
  Лечится перезагрузкой, и делать её человек не должен — делаем сами.
  Не чаще раза в минуту, чтобы настоящая поломка не ушла в вечный цикл.
*/
const STALE_VERSION =
  /Failed to find Server Action|ChunkLoadError|Loading chunk|dynamically imported module|deployment/i;
const RELOAD_KEY = "cs_stale_reload_at";

function reloadOnceIfStale(message: string): boolean {
  if (!STALE_VERSION.test(message)) return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // без sessionStorage перезагружать вслепую опасно — покажем экран
    return false;
  }
  window.location.reload();
  return true;
}
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (reloadOnceIfStale(error.message)) return;

    console.error("Ошибка страницы:", error);

    // В журнал — чтобы ошибку можно было найти по коду и через неделю.
    // keepalive: запрос уйдёт, даже если человек сразу закроет вкладку.
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        path: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold">Не получилось загрузить</h1>
        <p className="mt-2 text-muted">
          Похоже, пропала связь с сервером. Попробуйте ещё раз — обычно
          помогает с первой попытки.
        </p>

        <Button size="lg" className="mt-6 w-full" onClick={reset}>
          <RotateCw size={18} aria-hidden />
          Попробовать снова
        </Button>

        <Link
          href="/"
          className="mt-3 inline-block text-sm text-muted underline underline-offset-4"
        >
          Вернуться на главную
        </Link>

        {error.digest && (
          <p className="mt-6 font-mono text-xs text-muted">код {error.digest}</p>
        )}
      </div>
    </main>
  );
}
