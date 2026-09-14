import { beforeEach, describe, expect, it } from "vitest";
import { clearDraft, readDraft, writeDraft } from "@/app/(master)/my/draft";

// в тестах нет браузера — подкладываем простое хранилище
const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
  configurable: true,
});

const draft = {
  total: 55000,
  expenses: 0,
  expensesNote: "",
  items: [
    { title: "Диагностика", price: 10000, quantity: 1 },
    { title: "Ремонт модуля управления", price: 45000, quantity: 1 },
  ],
};

describe("черновик отчёта", () => {
  beforeEach(() => store.clear());

  it("переживает перезагрузку страницы", () => {
    writeDraft("order-1", draft);
    expect(readDraft("order-1")).toEqual(draft);
  });

  it("у каждой заявки свой черновик", () => {
    writeDraft("order-1", draft);
    expect(readDraft("order-2")).toBeNull();
  });

  it("после сохранения исчезает", () => {
    writeDraft("order-1", draft);
    clearDraft("order-1");
    expect(readDraft("order-1")).toBeNull();
  });

  it("испорченную запись не подсовывает в форму", () => {
    store.set("cs_draft_order-1", "{не json");
    expect(readDraft("order-1")).toBeNull();

    store.set("cs_draft_order-1", JSON.stringify({ total: "много" }));
    expect(readDraft("order-1")).toBeNull();
  });
});
