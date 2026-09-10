import { describe, expect, it } from "vitest";
import { calcSettlement, MAX_SHARE_PERCENT } from "@/lib/settlement";

/*
  Запчасти покупает компания. Значит расход — её деньги, и мастеру
  возмещать нечего: он делит с компанией только чистые.

  Согласовано 80 000, запчасти 13 500, чистыми 66 500, пополам по 33 250.

  Наличными: мастер собрал все 80 000, своих денег не тратил. Себе он
  оставляет 33 250, а вернуть должен 46 750 — это доля компании плюс
  её же деньги за запчасти.

  На счёт: у компании и так все 80 000, запчасти она оплатила сама.
  Мастеру причитается только его доля — 33 250.
*/

describe("calcSettlement — пример из жизни", () => {
  const base = { total: 80000, expenses: 13500, sharePercent: 50 };

  it("считает чистые и доли", () => {
    const r = calcSettlement({ ...base, paymentMethod: "cash" });
    expect(r.net).toBe(66500);
    expect(r.companyCut).toBe(33250);
    expect(r.masterCut).toBe(33250);
  });

  it("наличные: мастер вносит долю компании и стоимость запчастей", () => {
    const r = calcSettlement({ ...base, paymentMethod: "cash" });
    expect(r.direction).toBe("master_owes");
    expect(r.amount).toBe(46750);
  });

  it("безнал: компания отдаёт мастеру только его долю", () => {
    const r = calcSettlement({ ...base, paymentMethod: "transfer" });
    expect(r.direction).toBe("company_owes");
    expect(r.amount).toBe(33250);
  });

  it("деньги сходятся: что мастер оставил плюс что вернул равно согласованному", () => {
    const r = calcSettlement({ ...base, paymentMethod: "cash" });
    expect(r.masterCut + r.amount).toBe(base.total);
  });
});

describe("calcSettlement — без расхода", () => {
  it("наличными мастер возвращает ровно долю компании", () => {
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

  it("безнал без расхода возвращает долю мастера", () => {
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
    expect(r.amount).toBe(30000);
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

  it("при полной доле мастер возвращает всё", () => {
    const r = calcSettlement({
      total: 50000,
      expenses: 0,
      sharePercent: 100,
      paymentMethod: "cash",
    });
    expect(r.masterCut).toBe(0);
    expect(r.amount).toBe(50000);
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
      // наличными мастер всегда возвращает всё, кроме своей доли
      expect(r.masterCut + r.amount).toBe(12345);
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

  it("в убытке мастеру ничего не причитается, а вернуть надо всё собранное", () => {
    const r = calcSettlement({
      total: 10000,
      expenses: 15000,
      sharePercent: 50,
      paymentMethod: "cash",
    });
    expect(r.masterCut).toBe(0);
    expect(r.amount).toBe(10000);
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
