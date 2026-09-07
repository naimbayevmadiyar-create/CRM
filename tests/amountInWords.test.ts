import { describe, expect, it } from "vitest";
import { amountInWords } from "@/lib/amountInWords";

describe("amountInWords", () => {
  it("пишет сумму из примера клиента", () => {
    expect(amountInWords(80000)).toBe("Восемьдесят тысяч тенге 00 тиын");
  });

  it("согласует «одна тысяча» и «две тысячи» в женском роде", () => {
    expect(amountInWords(1000)).toBe("Одна тысяча тенге 00 тиын");
    expect(amountInWords(2000)).toBe("Две тысячи тенге 00 тиын");
    expect(amountInWords(5000)).toBe("Пять тысяч тенге 00 тиын");
  });

  it("держит сотни и десятки", () => {
    expect(amountInWords(13500)).toBe("Тринадцать тысяч пятьсот тенге 00 тиын");
    expect(amountInWords(66500)).toBe("Шестьдесят шесть тысяч пятьсот тенге 00 тиын");
  });

  it("не спотыкается на числах от одиннадцати до девятнадцати", () => {
    expect(amountInWords(11)).toBe("Одиннадцать тенге 00 тиын");
    expect(amountInWords(19)).toBe("Девятнадцать тенге 00 тиын");
    expect(amountInWords(112)).toBe("Сто двенадцать тенге 00 тиын");
  });

  it("держит миллионы", () => {
    expect(amountInWords(1350000)).toBe(
      "Один миллион триста пятьдесят тысяч тенге 00 тиын",
    );
    expect(amountInWords(2000000)).toBe("Два миллиона тенге 00 тиын");
  });

  it("ноль пишет словом, а не пустотой", () => {
    expect(amountInWords(0)).toBe("Ноль тенге 00 тиын");
  });

  it("округляет дробное до целых тенге", () => {
    expect(amountInWords(1500.7)).toBe("Одна тысяча пятьсот тенге 00 тиын");
  });

  it("первая буква заглавная, остальные строчные", () => {
    const result = amountInWords(21);
    expect(result[0]).toBe(result[0].toUpperCase());
    expect(result).toBe("Двадцать один тенге 00 тиын");
  });
});
