/*
  Service worker CRM «Честный сервис».

  Главное правило: в кеш не попадает НИ ОДНА страница с данными.
  Здесь имена, телефоны и адреса клиентов — если сохранить их в кеш
  браузера, они останутся на устройстве после выхода из системы
  и переживут смену пароля.

  Поэтому кешируем только неизменяемое: сборку Next, иконки, шрифты.
  Страницы всегда берём из сети; нет сети — показываем страницу «нет связи».
*/

const VERSION = "v3";
const SHELL_CACHE = `shell-${VERSION}`;
const OFFLINE_URL = "/offline";

// Файлы, без которых офлайн-страница не отрисуется
const SHELL = [OFFLINE_URL, "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Хешированные файлы сборки не меняются никогда — их можно держать вечно. */
function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".woff2") ||
    /^\/icon-\d+\.png$/.test(url.pathname) ||
    url.pathname === "/icon-maskable-512.png"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Меняющие запросы, чужие домены и приём обращений не трогаем вовсе
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Статика сборки: сначала кеш, он всё равно неизменяемый
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Страницы: только из сети. Нет связи — показываем заглушку,
  // но никогда не показываем чужие устаревшие данные.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error()),
      ),
    );
  }
});
