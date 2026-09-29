import { expect, test } from "@playwright/test";

test("home page shows the masthead and the chart", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The evolution of AI models");
  await expect(page.getByRole("region", { name: /Interactive timeline/ })).toBeVisible();
  // The growth animation finishes and every station becomes interactive.
  await expect(page.locator('[data-model-id="gpt-4"]')).not.toHaveClass(/tl-unborn/, { timeout: 5000 });
});

test("search selects a model and opens its record with sources", async ({ page }) => {
  await page.goto("/explore");
  // The shortcut listener attaches once the client app has hydrated.
  await expect(page.getByRole("button", { name: /Find a model or lab/ })).toBeVisible();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search models" });
  await expect(dialog).toBeVisible();
  await page.keyboard.type("llama 2");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/model=llama-2/);
  const panel = page.getByRole("complementary", { name: "Details for Llama 2" });
  await expect(panel.getByRole("heading", { name: "Llama 2", exact: true })).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Variants", exact: true })).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Sources", exact: true })).toBeVisible();
  // Its lineage is highlighted: LLaMA is lit, an unrelated model is dimmed.
  await expect(page.locator('[data-model-id="llama"]')).not.toHaveClass(/tl-dim/);
  await expect(page.locator('[data-model-id="claude-3"]')).toHaveClass(/tl-dim/);
});

test("filters dim, then hide, non-matching models", async ({ page }) => {
  await page.goto("/explore");
  await page.getByRole("button", { name: "Open weights", exact: true }).click();
  await expect(page).toHaveURL(/open=open-weights/);
  await expect(page.locator('[data-model-id="gpt-4"]')).toHaveClass(/tl-dim/);

  await page.getByLabel("Hide others").check();
  await expect(page).toHaveURL(/hide=1/);
  await expect(page.locator('[data-model-id="gpt-4"]')).toHaveClass(/tl-gone/);
  await expect(page.locator('[data-model-id="llama-2"]')).not.toHaveClass(/tl-gone/);
});

test("play replays history and can be paused", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.locator('[data-model-id="gpt-4"]')).not.toHaveClass(/tl-unborn/, { timeout: 5000 });
  await page.getByRole("button", { name: "Replay history from 2017" }).click();
  const pause = page.getByRole("button", { name: "Pause the replay" });
  await expect(pause).toBeVisible();
  await expect(page.locator('[data-model-id="gpt-6"]')).toHaveClass(/tl-unborn/);
  await pause.click();
  await expect(page.getByRole("button", { name: "Replay history from 2017" })).toBeVisible();
});

test("the table view lists and sorts models", async ({ page }) => {
  await page.goto("/explore?view=list");
  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  await table.getByRole("button", { name: /Model/ }).click();
  await expect(table.locator("tbody tr").first()).toContainText(/^[A-C]/);
});

test("model records are static pages", async ({ page }) => {
  await page.goto("/models/gpt-4");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("GPT-4");
  await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();
  await expect(page.getByText("Successor of")).toBeVisible();
});

test("the dataset is downloadable as JSON", async ({ request }) => {
  const res = await request.get("/data/models.json");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.models.length).toBeGreaterThan(100);
  expect(body.organizations.length).toBeGreaterThan(10);
});
