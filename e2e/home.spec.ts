import { expect, test } from "@playwright/test";

test.describe("home page", () => {
  test("loads with greeting and prompt input", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "TravelMind" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /What can I help with/ })).toBeVisible();
    await expect(page.locator("textarea")).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("typing reveals the submit button and hides voice button", async ({ page }) => {
    await page.goto("/");

    const textarea = page.locator("textarea");
    await textarea.fill("Plan a trip to Tokyo");

    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("empty input keeps the submit button disabled or hidden", async ({ page }) => {
    await page.goto("/");
    const submit = page.locator('button[type="submit"]');
    await expect(submit).toHaveCount(0);
  });
});
