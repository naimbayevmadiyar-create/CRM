#!/usr/bin/env node
// Собирает архив проекта для передачи заказчику.
// Без node_modules, сборки, истории git и локальных секретов.
//   npm run pack

import { cp, rm, stat, mkdtemp } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "chestny-crm.zip");

const SKIP = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  "test-results",
  "playwright-report",
  "blob-report",
  ".env",
  ".env.local",
  "chestny-crm.zip",
  "tsconfig.tsbuildinfo",
]);

// Копируем нужное во временную папку: так Compress-Archive сохраняет
// структуру каталогов, чего он не делает при передаче списка файлов.
const staging = path.join(await mkdtemp(path.join(tmpdir(), "chestny-crm-")), "chestny-crm");

await cp(ROOT, staging, {
  recursive: true,
  filter: (src) => !SKIP.has(path.basename(src)),
});

await rm(OUT, { force: true });

await run(
  "powershell",
  [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path '${staging}' -DestinationPath '${OUT}' -Force`,
  ],
  { maxBuffer: 32 * 1024 * 1024 },
);

await rm(path.dirname(staging), { recursive: true, force: true });

const { size } = await stat(OUT);
console.log(`Готово: chestny-crm.zip — ${(size / 1024).toFixed(1)} КБ`);
