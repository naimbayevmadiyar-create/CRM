#!/usr/bin/env node
// Генератор хешей паролей.
//   npm run hash -- "пароль админа"
// Полученную строку положить в ADMIN_PASSWORD_HASH или MASTER_PASSWORD_HASH.
// Сам пароль никуда не сохраняется — держите его в менеджере паролей.

import { randomBytes, scryptSync } from "node:crypto";

const plain = process.argv[2];

if (!plain) {
  console.error('Использование: npm run hash -- "ваш пароль"');
  process.exit(1);
}

if (plain.length < 6) {
  console.error("Пароль короче шести символов — так нельзя.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(plain, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });

console.log(`scrypt$${salt.toString("hex")}$${hash.toString("hex")}`);
