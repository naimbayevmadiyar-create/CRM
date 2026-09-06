import { defineConfig, devices } from "@playwright/test";

/**
 * Проверяется только основной путь мастера: вход, выбор имени, смена этапа.
 * Экран телефона, а не компьютера, — именно так CRM и используют в поле.
 *
 * Нужна поднятая база с применёнными миграциями и seed.sql,
 * а в .env.local — пароли, соответствующие E2E_MASTER_PASSWORD.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  reporter: [["list"]],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: "http://localhost:3000",
    ...devices["Pixel 5"],
    trace: "retain-on-failure",
  },
});
