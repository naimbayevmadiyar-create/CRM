import { test, expect } from "@playwright/test";

const MASTER_PASSWORD = process.env.E2E_MASTER_PASSWORD ?? "master-test";

test("мастер входит, выбирает имя и отмечает выезд", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Пароль").fill(MASTER_PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page.getByRole("heading", { name: "Кто ты?" })).toBeVisible();
  await page.getByRole("button", { name: "Валихан" }).click();

  await expect(page.getByRole("heading", { name: "Мои заявки" })).toBeVisible();

  // главное требование: реакция на нажатие мгновенная, без ожидания сервера
  const advance = page.getByRole("button", { name: "Выехал" }).first();
  await expect(advance).toBeVisible();
  await advance.click();

  await expect(page.getByRole("button", { name: "На месте" }).first()).toBeVisible({
    timeout: 2000,
  });
});

test("чужой пароль не пускает", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Пароль").fill("совершенно-неверный-пароль");
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page.getByRole("alert")).toContainText("Неверный пароль");
});

test("мастер не попадает в админку", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Пароль").fill(MASTER_PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.getByRole("button", { name: "Валихан" }).click();

  await page.goto("/analytics");
  await expect(page).toHaveURL(/\/my$/);
});
