import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/passwords";

describe("пароли", () => {
  it("проверяет верный пароль", () => {
    const stored = hashPassword("master-2026");
    expect(verifyPassword("master-2026", stored)).toBe(true);
  });

  it("отвергает неверный", () => {
    const stored = hashPassword("master-2026");
    expect(verifyPassword("master-2025", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
  });

  it("каждый раз даёт новую соль", () => {
    expect(hashPassword("одинаковый")).not.toBe(hashPassword("одинаковый"));
  });

  it("работает с кириллицей и пробелами", () => {
    const stored = hashPassword("пароль мастера 2026");
    expect(verifyPassword("пароль мастера 2026", stored)).toBe(true);
    expect(verifyPassword("пароль мастера 2027", stored)).toBe(false);
  });

  it("не падает на мусоре вместо хеша", () => {
    expect(verifyPassword("любой", "испорчено")).toBe(false);
    expect(verifyPassword("любой", "")).toBe(false);
    expect(verifyPassword("любой", "scrypt$нехекс$нехекс")).toBe(false);
    expect(verifyPassword("любой", "bcrypt$aa$bb")).toBe(false);
  });

  it("формат хранения узнаваем и разбирается на три части", () => {
    const parts = hashPassword("x").split("$");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("scrypt");
    expect(parts[1]).toHaveLength(32);
    expect(parts[2]).toHaveLength(128);
  });
});
