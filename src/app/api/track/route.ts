import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { parseTrackBody } from "./parse";
import { detectSource } from "@/lib/source";
import { countRecentByIp, insertLead } from "@/lib/db/leads";
import { notifyLead } from "@/lib/telegram";

/**
 * Приём обращений с сайта chestny-service.kz.
 *
 * Сайт живёт на другом домене, поэтому запрос междоменный. Отправляется он
 * через navigator.sendBeacon с типом text/plain — такой запрос считается
 * простым и не требует предварительного OPTIONS.
 *
 * Отвечаем всегда 204 и без тела: браузер в этот момент уже уводит человека
 * в WhatsApp, задерживать его нечем и незачем. По той же причине любая
 * внутренняя ошибка не превращается в 500 — обращение важно, но не важнее
 * перехода пользователя.
 */

const RATE_LIMIT_PER_MINUTE = 30;

function allowedOrigin(): string {
  return process.env.TRACK_ALLOWED_ORIGIN ?? "";
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = allowedOrigin();
  return allowed && origin === allowed
    ? { "Access-Control-Allow-Origin": allowed, Vary: "Origin" }
    : {};
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders(request.headers.get("origin")),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  // чужой домен молча игнорируем: отвечать содержательно нечего
  if (origin && allowedOrigin() && origin !== allowedOrigin()) {
    return new NextResponse(null, { status: 204 });
  }

  const input = parseTrackBody(await request.text());
  if (!input) return new NextResponse(null, { status: 204, headers });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = createHash("sha256")
    .update(ip + (process.env.IP_HASH_SALT ?? ""))
    .digest("hex");

  try {
    if ((await countRecentByIp(ipHash, 60)) >= RATE_LIMIT_PER_MINUTE) {
      return new NextResponse(null, { status: 204, headers });
    }

    const source = detectSource({
      gclid: input.gclid,
      utmSource: input.utm_source,
      utmMedium: input.utm_medium,
      referrer: input.referrer,
    });

    await insertLead({
      ...input,
      source,
      ip_hash: ipHash,
      user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    });

    await notifyLead({ channel: input.channel, source, anchor: input.page_anchor });
  } catch {
    // приём обращения не должен ломать переход пользователя
  }

  return new NextResponse(null, { status: 204, headers });
}
