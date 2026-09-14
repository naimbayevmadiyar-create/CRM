import { getSession } from "@/lib/auth";
import { logError } from "@/lib/db/errors";

/**
 * Приём ошибок из браузера.
 *
 * Серверные ошибки ловит instrumentation.ts, а эти случаются уже на телефоне:
 * устаревшая после обновления страница, пропавшая сеть. Принимаем только от
 * вошедших — иначе любой мог бы засыпать журнал мусором.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return new Response(null, { status: 401 });

  let body: { message?: unknown; digest?: unknown; path?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const text = (value: unknown) => (typeof value === "string" ? value : null);

  await logError({
    source: "client",
    message: text(body.message) ?? "без описания",
    digest: text(body.digest),
    path: text(body.path),
    role: session.role,
    userAgent: request.headers.get("user-agent"),
  });

  return new Response(null, { status: 204 });
}
