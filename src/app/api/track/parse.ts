/**
 * Разбор тела обращения.
 *
 * Вынесено из обработчика отдельной чистой функцией: тело приходит из внешнего
 * мира, и проверять его надо тестами, а не надеждой. Никакие поля, кроме
 * перечисленных, внутрь не проходят — подменить источник или привязку
 * к заявке снаружи нельзя.
 */

export type TrackInput = {
  channel: "whatsapp" | "phone";
  page_anchor: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  referrer: string | null;
};

function str(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export function parseTrackBody(raw: string): TrackInput | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;

  const body = data as Record<string, unknown>;
  const channel = body.channel;
  if (channel !== "whatsapp" && channel !== "phone") return null;

  return {
    channel,
    page_anchor: str(body.anchor),
    utm_source: str(body.utm_source),
    utm_medium: str(body.utm_medium),
    utm_campaign: str(body.utm_campaign),
    utm_term: str(body.utm_term),
    utm_content: str(body.utm_content),
    gclid: str(body.gclid),
    referrer: str(body.referrer, 500),
  };
}
