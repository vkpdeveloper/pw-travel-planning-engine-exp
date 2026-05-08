import { expect, test } from "@playwright/test";

test("home page loads without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();

  await expect(page).toHaveTitle(/.+/);
  await expect(page.locator("body")).toBeVisible();

  expect(errors).toEqual([]);
});
