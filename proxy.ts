import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * В Next 16 файл перехвата называется proxy.ts, а не middleware.ts,
 * и экспортируемая функция должна называться proxy. Runtime только nodejs.
 *
 * Задача здесь одна — не пустить чужого на чужой экран до рендера.
 * Версию пароля мастеров тут не сверяем: это поход в базу на каждый запрос.
 * Она проверяется в getSession() на самой странице.
 */

const PUBLIC_PREFIXES = ["/login", "/api/track"];
const ADMIN_PREFIXES = ["/orders", "/leads", "/masters", "/analytics"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const session = await verifySession(token);

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (session.role === "master" && ADMIN_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/my";
    return NextResponse.redirect(url);
  }

  if (session.role === "admin" && (pathname.startsWith("/my") || pathname.startsWith("/who"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/orders";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
};
