/**
 * Откуда пришёл человек.
 *
 * Считается на сервере при приёме обращения и дальше не меняется руками —
 * иначе цифры в аналитике превращаются в мнение диспетчера.
 */

export const SOURCES = ["google_ads", "2gis", "organic", "referral", "direct"] as const;

export type Source = (typeof SOURCES)[number];

export const SOURCE_LABEL: Record<Source, string> = {
  google_ads: "Google Ads",
  "2gis": "2ГИС",
  organic: "Поиск",
  referral: "Переход",
  direct: "Прямой заход",
};

export type SourceInput = {
  gclid?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  referrer?: string | null;
};

const OWN_HOSTS = ["chestny-service.kz", "www.chestny-service.kz"];
const SEARCH_HOSTS = ["google.", "yandex.", "bing.", "duckduckgo.", "mail.ru", "rambler."];
const PAID_MEDIUMS = ["cpc", "ppc", "paid", "paidsearch"];

function hostOf(referrer: string): string | null {
  try {
    const url = new URL(referrer);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function detectSource(input: SourceInput): Source {
  const utmSource = (input.utmSource ?? "").toLowerCase();
  const utmMedium = (input.utmMedium ?? "").toLowerCase();

  // gclid ставит сам Google при клике по объявлению — самый надёжный признак
  if (input.gclid) return "google_ads";
  if (utmSource === "google" && PAID_MEDIUMS.includes(utmMedium)) return "google_ads";
  if (utmSource.includes("2gis")) return "2gis";

  const host = input.referrer ? hostOf(input.referrer) : null;
  if (!host) return "direct";
  if (OWN_HOSTS.includes(host)) return "direct";
  if (host.includes("2gis")) return "2gis";
  if (SEARCH_HOSTS.some((s) => host.includes(s))) return "organic";
  return "referral";
}
