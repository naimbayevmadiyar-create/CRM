import { describe, expect, it } from "vitest";
import { formatTenge, formatPhone, formatWhen, cn } from "@/lib/format";

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
});

describe("cn", () => {
  it("склеивает и отбрасывает пустое", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
  it("на пустом входе даёт пустую строку", () => {
    expect(cn()).toBe("");
  });
});
