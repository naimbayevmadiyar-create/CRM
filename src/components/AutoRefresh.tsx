"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Тихо подтягивает свежие данные.
 *
 * Мастеру обещано, что страницу обновлять не нужно, — значит она должна
 * обновляться сама. Диспетчеру то же самое нужно для новых обращений.
 *
 * Три правила, чтобы не жечь трафик и батарею:
 *  - пока вкладка скрыта, не опрашиваем вовсе;
 *  - при возвращении к вкладке обновляем сразу, а не ждём таймер;
 *  - при потере сети молчим до её возвращения.
 *
 * router.refresh() перезапрашивает только серверную разметку и не сбрасывает
 * состояние форм и ввода — человек не теряет набранную сумму.
 */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        router.refresh();
      }
    };

    const timer = setInterval(tick, seconds * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [router, seconds]);

  return null;
}
