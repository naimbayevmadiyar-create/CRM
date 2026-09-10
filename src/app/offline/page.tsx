import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Нет связи" };

/**
 * Показывается, когда телефон потерял сеть. Данные тут не показываем
 * принципиально: лучше честно сказать «нет связи», чем показать
 * вчерашний список заявок и заставить мастера ехать не туда.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-surface2">
          <WifiOff size={28} className="text-muted" aria-hidden />
        </div>

        <h1 className="text-2xl font-semibold">Нет связи</h1>
        <p className="mt-2 text-muted">
          Телефон не видит сеть. Заявки покажутся, как только интернет вернётся —
          приложение проверит само.
        </p>

        <p className="mt-6 text-sm text-muted">
          Если нужно срочно — позвоните диспетчеру.
        </p>
      </div>
    </main>
  );
}
