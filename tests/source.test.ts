import { describe, expect, it } from "vitest";
import { detectSource, SOURCE_LABEL, SOURCES } from "@/lib/source";

describe("detectSource", () => {
  it("gclid всегда означает Google Ads, даже если реферер похож на органику", () => {
    expect(detectSource({ gclid: "Cj0KCQ", referrer: "https://www.google.com/" }))
      .toBe("google_ads");
  });

  it("метка cpc от google тоже означает рекламу", () => {
    expect(detectSource({ utmSource: "google", utmMedium: "cpc" })).toBe("google_ads");
    expect(detectSource({ utmSource: "Google", utmMedium: "PPC" })).toBe("google_ads");
  });

  it("google без платной метки рекламой не считается", () => {
    expect(detectSource({ utmSource: "google", utmMedium: "organic" })).toBe("direct");
  });

  it("2ГИС узнаётся по переходу", () => {
    expect(detectSource({ referrer: "https://2gis.kz/astana/firm/70000001113800596" }))
      .toBe("2gis");
  });

  it("2ГИС узнаётся и по метке", () => {
    expect(detectSource({ utmSource: "2gis" })).toBe("2gis");
  });

  it("поиск без gclid — это органика", () => {
    expect(detectSource({ referrer: "https://www.google.com/search?q=ремонт" }))
      .toBe("organic");
    expect(detectSource({ referrer: "https://yandex.kz/search/" })).toBe("organic");
  });

  it("любой другой сайт — переход", () => {
    expect(detectSource({ referrer: "https://instagram.com/chestny.service" }))
      .toBe("referral");
  });

  it("без реферера и меток — прямой заход", () => {
    expect(detectSource({})).toBe("direct");
    expect(detectSource({ referrer: "" })).toBe("direct");
    expect(detectSource({ referrer: null, gclid: null })).toBe("direct");
  });

  it("переход с самого сайта считается прямым, а не переходом", () => {
    expect(detectSource({ referrer: "https://chestny-service.kz/" })).toBe("direct");
    expect(detectSource({ referrer: "https://www.chestny-service.kz/#ceny" })).toBe("direct");
  });

  it("не падает на мусоре в реферере", () => {
    expect(detectSource({ referrer: "не-ссылка" })).toBe("direct");
    expect(detectSource({ referrer: "javascript:void(0)" })).toBe("direct");
  });
});

describe("SOURCE_LABEL", () => {
  it("у каждого источника есть человеческая подпись", () => {
    expect(Object.keys(SOURCE_LABEL)).toHaveLength(SOURCES.length);
    expect(SOURCE_LABEL.google_ads).toBe("Google Ads");
    expect(SOURCE_LABEL["2gis"]).toBe("2ГИС");
  });
});
