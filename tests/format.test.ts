import { describe, expect, it } from "vitest";
import {
  cn,
  formatDateTime,
  formatDuration,
  formatPhone,
  formatTenge,
  formatTime,
  formatWhen,
  isToday,
  isoToLocalInput,
  localInputToIso,
  phoneDigits,
} from "@/lib/format";

// В деньгах используется неразрывный пробел, чтобы «3» и «500 ₸» не разъезжались
// по строкам. В тестах задаём его escape-последовательностью, иначе легко
// написать обычный пробел и получить ложно-зелёный тест.
const NBSP = "\u00a0";

describe("formatTenge", () => {
  it("разделяет тысячи неразрывным пробелом", () => {
    expect(formatTenge(3500)).toBe(`3${NBSP}500${NBSP}₸`);
  });
  it("не показывает копейки", () => {
    expect(formatTenge(12000.4)).toBe(`12${NBSP}000${NBSP}₸`);
  });
  it("ноль остаётся нулём, а не прочерком", () => {
    expect(formatTenge(0)).toBe(`0${NBSP}₸`);
  });
  it("держит миллионы", () => {
    expect(formatTenge(1350000)).toBe(`1${NBSP}350${NBSP}000${NBSP}₸`);
  });
});

describe("formatPhone", () => {
  it("приводит казахстанский номер к читаемому виду", () => {
    expect(formatPhone("77080246236")).toBe("+7 708 024 62 36");
  });
  it("понимает восьмёрку вместо семёрки", () => {
    expect(formatPhone("87080246236")).toBe("+7 708 024 62 36");
  });
  it("терпит уже отформатированный ввод", () => {
    expect(formatPhone("+7 708 024 62 36")).toBe("+7 708 024 62 36");
  });
  it("возвращает как есть, если это не 11 цифр", () => {
    expect(formatPhone("12345")).toBe("12345");
  });
});

describe("phoneDigits", () => {
  it("оставляет только цифры для ссылок tel: и wa.me", () => {
    expect(phoneDigits("+7 708 024 62 36")).toBe("77080246236");
  });
  it("приводит восьмёрку к семёрке", () => {
    expect(phoneDigits("8 708 024 62 36")).toBe("77080246236");
  });
});

describe("formatWhen", () => {
  const now = new Date("2026-09-06T12:00:00Z");

  it("совсем свежее показывает как «только что»", () => {
    expect(formatWhen("2026-09-06T11:59:30Z", now)).toBe("только что");
  });
  it("минуты считает минутами", () => {
    expect(formatWhen("2026-09-06T11:55:00Z", now)).toBe("5 мин назад");
  });
  it("часы считает часами", () => {
    expect(formatWhen("2026-09-06T09:00:00Z", now)).toBe("3 ч назад");
  });
  it("старое показывает датой", () => {
    expect(formatWhen("2026-09-01T09:00:00Z", now)).toBe("1 сентября");
  });

  // Сервис работает до 20:00 по Астане, то есть каждый вечер попадает
  // на следующие сутки по UTC. Дата обязана считаться по местному поясу.
  it("вечернюю заявку не переносит на вчера", () => {
    const later = new Date("2026-09-10T12:00:00Z");
    // 20:00 UTC = 01:00 7 сентября по Астане
    expect(formatWhen("2026-09-06T20:00:00Z", later)).toBe("7 сентября");
  });
});

describe("formatDateTime и formatTime", () => {
  it("показывают астанинское время, а не UTC", () => {
    // 06:30 UTC = 11:30 в Астане
    expect(formatTime("2026-09-06T06:30:00Z")).toBe("11:30");
    expect(formatDateTime("2026-09-06T06:30:00Z")).toContain("11:30");
    expect(formatDateTime("2026-09-06T06:30:00Z")).toContain("сентября");
  });
});

describe("isToday", () => {
  it("сравнивает по астанинским суткам", () => {
    const now = new Date("2026-09-07T03:00:00Z"); // 08:00 7 сентября в Астане
    expect(isToday("2026-09-06T20:00:00Z", now)).toBe(true); // 01:00 7 сентября
    expect(isToday("2026-09-06T10:00:00Z", now)).toBe(false); // 15:00 6 сентября
  });
});

describe("formatDuration", () => {
  it("минуты оставляет минутами", () => {
    expect(formatDuration(45)).toBe("45 мин");
  });
  it("больше часа разбивает на часы и минуты", () => {
    expect(formatDuration(95)).toBe("1 ч 35 мин");
  });
  it("ровные часы не тащат нулевые минуты", () => {
    expect(formatDuration(120)).toBe("2 ч");
  });
});

describe("cn", () => {
  it("склеивает и отбрасывает пустое", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
  it("на пустом входе даёт пустую строку", () => {
    expect(cn()).toBe("");
  });
});

describe("localInputToIso", () => {
  it("трактует ввод как астанинское время, а не как UTC", () => {
    // 14:30 в Астане — это 09:30 UTC
    expect(localInputToIso("2026-09-07T14:30")).toBe("2026-09-07T09:30:00.000Z");
  });
  it("полночь не уезжает на предыдущие сутки", () => {
    expect(localInputToIso("2026-09-07T00:00")).toBe("2026-09-06T19:00:00.000Z");
  });
  it("пустое значение не превращает в дату", () => {
    expect(localInputToIso("")).toBeUndefined();
    expect(localInputToIso("не дата")).toBeUndefined();
  });
});

describe("isoToLocalInput", () => {
  it("возвращает то, что примет поле формы", () => {
    expect(isoToLocalInput("2026-09-07T09:30:00.000Z")).toBe("2026-09-07T14:30");
  });
  it("обратимо с localInputToIso", () => {
    const value = "2026-09-07T18:45";
    expect(isoToLocalInput(localInputToIso(value)!)).toBe(value);
  });
});
