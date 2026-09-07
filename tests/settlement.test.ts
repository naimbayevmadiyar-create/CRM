import { describe, expect, it } from "vitest";
import { calcSettlement, MAX_SHARE_PERCENT } from "@/lib/settlement";

describe("calcSettlement — пример из жизни", () => {
  // Согласовано 80 000, расход 13 500, чистыми 66 500, в кассу 33 250
  const base = { total: 80000, expenses: 13500, sharePercent: 50 };

  it("считает чистые и доли ровно как в отчёте", () => {
    const r = calcSettlement({ ...base, paymentMethod: "cash" });
    expect(r.net).toBe(66500);
    expect(r.companyCut).toBe(33250);
    expect(r.masterCut).toBe(33250);
  });

  it("наличные: мастер вносит долю компании", () => {
    const r = calcSettlement({ ...base, paymentMethod: "cash" });
    expect(r.direction).toBe("master_owes");
    expect(r.amount).toBe(33250);
  });

  it("безнал: компания возвращает мастеру долю и расход", () => {
    const r = calcSettlement({ ...base, paymentMethod: "transfer" });
    expect(r.direction).toBe("company_owes");
    // 33 250 своей доли + 13 500 потраченных на запчасти
    expect(r.amount).toBe(46750);
  });
});

describe("calcSettlement — без расхода", () => {
  it("чистые равны согласованному", () => {
    const r = calcSettlement({
      total: 20000,
      expenses: 0,
      sharePercent: 50,
      paymentMethod: "cash",
    });
    expect(r.net).toBe(20000);
    expect(r.companyCut).toBe(10000);
    expect(r.amount).toBe(10000);
  });

  it("безнал без расхода возвращает только долю мастера", () => {
    const r = calcSettlement({
      total: 20000,
      expenses: 0,
      sharePercent: 50,
      paymentMethod: "transfer",
    });
    expect(r.amount).toBe(10000);
  });
});

describe("calcSettlement — другие доли", () => {
  it("держит долю, отличную от половины", () => {
    const r = calcSettlement({
      total: 100000,
      expenses: 0,
      sharePercent: 30,
      paymentMethod: "cash",
    });
    expect(r.companyCut).toBe(30000);
    expect(r.masterCut).toBe(70000);
  });

  it("нулевая доля означает, что всё остаётся мастеру", () => {
    const r = calcSettlement({
      total: 50000,
      expenses: 0,
      sharePercent: 0,
      paymentMethod: "cash",
    });
    expect(r.companyCut).toBe(0);
    expect(r.masterCut).toBe(50000);
    expect(r.amount).toBe(0);
  });
});

describe("calcSettlement — округление", () => {
  it("доли всегда складываются в чистые, без потерянного тенге", () => {
    const r = calcSettlement({
      total: 66501,
      expenses: 0,
      sharePercent: 50,
      paymentMethod: "cash",
    });
    expect(r.companyCut + r.masterCut).toBe(r.net);
  });

  it("копеек не появляется ни при какой доле", () => {
    for (const percent of [33, 37, 51, 66, 99]) {
      const r = calcSettlement({
        total: 12345,
        expenses: 777,
        sharePercent: percent,
        paymentMethod: "cash",
      });
      expect(Number.isInteger(r.companyCut)).toBe(true);
      expect(Number.isInteger(r.masterCut)).toBe(true);
      expect(r.companyCut + r.masterCut).toBe(r.net);
    }
  });
});

describe("calcSettlement — защита от мусора", () => {
  it("расход больше согласованного помечается как убыток", () => {
    const r = calcSettlement({
      total: 10000,
      expenses: 15000,
      sharePercent: 50,
      paymentMethod: "cash",
    });
    expect(r.net).toBe(-5000);
    expect(r.isLoss).toBe(true);
  });

  it("доля за пределами шкалы приводится к границам", () => {
    const high = calcSettlement({
      total: 1000,
      expenses: 0,
      sharePercent: 500,
      paymentMethod: "cash",
    });
    expect(high.sharePercent).toBe(MAX_SHARE_PERCENT);

    const low = calcSettlement({
      total: 1000,
      expenses: 0,
      sharePercent: -20,
      paymentMethod: "cash",
    });
    expect(low.sharePercent).toBe(0);
  });
});
