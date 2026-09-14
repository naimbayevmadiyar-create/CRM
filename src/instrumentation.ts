import type { Instrumentation } from "next";

/**
 * Все ошибки сервера — в журнал, с тем же кодом, что человек видит на экране.
 *
 * Логи Vercel на бесплатном тарифе живут около часа, а о сбое сообщают
 * вечером. Код с экрана ищется в таблице app_errors — хоть через неделю.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const error = err as Error & { digest?: string };
  const agent = request.headers["user-agent"];

  const { logError } = await import("@/lib/db/errors");
  await logError({
    source: "server",
    message: error.message || String(err),
    digest: error.digest,
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    userAgent: Array.isArray(agent) ? agent[0] : agent,
  });
};
