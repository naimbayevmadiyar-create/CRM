"use client";

import { useEffect } from "react";

/**
 * Регистрация service worker.
 *
 * Нужен ради двух вещей: приложение устанавливается на телефон, и при
 * пропаже связи мастер видит понятную страницу вместо динозавра браузера.
 *
 * Данные он не кеширует — это принципиально, см. комментарий в public/sw.js.
 *
 * При выходе из системы регистрация снимается и кеш чистится: на общем
 * телефоне не должно оставаться ничего от предыдущего человека.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // не зарегистрировался — приложение работает как обычный сайт
      });
    };

    // не мешаем первой отрисовке
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
