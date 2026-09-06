import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Хеширование паролей на scrypt из стандартной библиотеки Node.
 *
 * Спека называла Argon2id; заменено осознанно, чтобы не тащить нативную
 * зависимость на Vercel. scrypt — такой же медленный по памяти KDF,
 * рекомендованный OWASP, и он уже есть в рантайме.
 *
 * Формат хранения: scrypt$<соль hex>$<хеш hex>
 * Сами пароли нигде не хранятся — ни в базе, ни в коде.
 */

const KEY_LENGTH = 64;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, KEY_LENGTH, PARAMS);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const [, saltHex, hashHex] = parts;
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) return false;

  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    if (expected.length !== KEY_LENGTH) return false;

    const actual = scryptSync(plain, salt, KEY_LENGTH, PARAMS);
    // сравнение за постоянное время, чтобы по задержке нельзя было подбирать
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
