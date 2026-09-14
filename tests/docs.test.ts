import { describe, expect, it } from "vitest";
import { contractDate, docNumber, longDateRu, shortDateRu } from "@/lib/docs";

describe("docNumber", () => {
  it("дополняет номер нулями до трёх знаков", () => {
    expect(docNumber(4)).toBe("000-004");
    expect(docNumber(42)).toBe("000-042");
    expect(docNumber(777)).toBe("000-777");
  });

  it("держит приставку из настроек", () => {
    expect(docNumber(4, "001")).toBe("001-004");
  });

  it("номера длиннее трёх знаков не обрезает", () => {
    expect(docNumber(1234)).toBe("000-1234");
  });
});

describe("даты документов", () => {
  // вечер в Астане: в UTC это ещё предыдущий день — бланк должен
  // показывать местную дату, иначе документ «выписан вчера»
  const evening = "2026-09-14T19:30:00+05:00";

  it("пишет дату прописью для шапки", () => {
    expect(longDateRu(evening)).toBe("14 сентября 2026 г.");
  });

  it("пишет короткую дату", () => {
    expect(shortDateRu(evening)).toBe("14.09.2026");
  });

  it("датой договора считает день заявки, если её не вписали", () => {
    expect(contractDate(null, evening)).toBe("14.09.2026");
  });

  it("вписанную дату договора уважает", () => {
    expect(contractDate("2026-08-27", evening)).toBe("27.08.2026");
  });
});
