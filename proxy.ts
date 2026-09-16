import { NextResponse, type NextRequest } from "next/server";
import {
  readSession,
  signSession,
  REFRESH_AFTER_SECONDS,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/session";

/**
 * В Next 16 файл перехвата называется proxy.ts, а не middleware.ts,
 * и экспортируемая функция должна называться proxy. Runtime только nodejs.
 *
 * Задач две. Первая — не пустить чужого на чужой экран до рендера. Вторая —
 * продлевать вход: раз в неделю кука переподписывается, поэтому у человека,
 * который пользуется системой, сессия не заканчивается никогда.
 *
 * Версию пароля мастера тут не сверяем: это поход в базу на каждый запрос.
 * Она проверяется в getSession() на самой странице.
 */

const PUBLIC_PREFIXES = ["/login", "/api/track"];
const ADMIN_PREFIXES = [
  "/orders",
  "/leads",
  "/masters",
  "/analytics",
  "/invoices",
  "/expenses",
  "/settings",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const found = await readSession(token);

  if (!found) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const { session, issuedAt } = found;

  if (session.role === "master" && ADMIN_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/my";
    return NextResponse.redirect(url);
  }

  if (session.role === "admin" && pathname.startsWith("/my")) {
    const url = request.nextUrl.clone();
    url.pathname = "/orders";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();

  const age = Math.floor(Date.now() / 1000) - issuedAt;
  if (age > REFRESH_AFTER_SECONDS) {
    response.cookies.set(SESSION_COOKIE, await signSession(session), SESSION_COOKIE_OPTIONS);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
};
