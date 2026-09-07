"use client";

/**
 * Последний рубеж: сюда попадают ошибки самого корневого макета,
 * когда ни стилей, ни шрифтов ещё нет. Поэтому здесь всё написано
 * инлайновыми стилями и без единой зависимости.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#f5f7fb",
          color: "#0f1b2d",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>
            Что-то сломалось
          </h1>
          <p style={{ marginTop: 8, color: "#5d6878", lineHeight: 1.5 }}>
            Приложение не смогло запуститься. Обновите страницу — если не
            поможет, напишите разработчику и назовите код ниже.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              height: 56,
              width: "100%",
              border: 0,
              borderRadius: 14,
              background: "#1550e4",
              color: "#fff",
              fontSize: 17,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Обновить
          </button>
          {error.digest && (
            <p style={{ marginTop: 24, fontSize: 12, color: "#5d6878" }}>
              код {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
