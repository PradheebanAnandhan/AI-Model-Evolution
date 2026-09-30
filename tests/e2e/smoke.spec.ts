import { expect, test } from "@playwright/test";

test("home page shows the title, the chart and the latest milestone", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The evolution of AI models");
  await expect(page.getByRole("region", { name: /Interactive timeline/ })).toBeVisible();
  // The growth animation finishes and every node becomes interactive.
  await expect(page.locator('[data-model-id="gpt-4"]')).not.toHaveClass(/tl-unborn/, { timeout: 5000 });
  // With nothing picked, the side panel features the newest milestone.
  const panel = page.getByRole("complementary", { name: /Details for/ });
  await expect(panel.getByText("Latest milestone")).toBeVisible();
});

test("search selects a model and opens its record with sources", async ({ page }) => {
  await page.goto("/");
  // The shortcut listener attaches once the client app has hydrated.
  await expect(page.getByRole("button", { name: "Search models and labs" })).toBeVisible();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search models" });
  await expect(dialog).toBeVisible();
  await page.keyboard.type("llama 2");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/model=llama-2/);
  const panel = page.getByRole("complementary", { name: "Details for Llama 2" });
  await expect(panel.getByRole("heading", { name: "Llama 2", exact: true })).toBeVisible();
  await panel.getByRole("tab", { name: "Technical" }).click();
  await expect(panel.getByRole("heading", { name: "Variants", exact: true })).toBeVisible();
  await panel.getByRole("tab", { name: "Sources" }).click();
  await expect(panel.getByRole("heading", { name: "Sources", exact: true })).toBeVisible();
  // Its lineage is highlighted: LLaMA is lit, an unrelated model is dimmed.
  await expect(page.locator('[data-model-id="llama"]')).not.toHaveClass(/tl-dim/);
  await expect(page.locator('[data-model-id="claude-3"]')).toHaveClass(/tl-dim/);
});

test("a citation opens the Sources tab", async ({ page }) => {
  await page.goto("/?model=gpt-4");
  const panel = page.getByRole("complementary", { name: "Details for GPT-4" });
  await panel.getByRole("button", { name: /^Source 1:/ }).first().click();
  await expect(panel.getByRole("tab", { name: "Sources" })).toHaveAttribute("aria-selected", "true");
});

test("search from another page opens the model on the timeline", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("button", { name: "Search models and labs" })).toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog", { name: "Search models" })).toBeVisible();
  await page.keyboard.type("deepseek-r1");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/\?model=deepseek-r1$/);
  await expect(page.getByRole("complementary", { name: "Details for DeepSeek-R1" })).toBeVisible();
});

test("filters dim, then hide, non-matching models", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Openness" }).click();
  await page.getByRole("checkbox", { name: "Open weights" }).check();
  await expect(page).toHaveURL(/open=open-weights/);
  await expect(page.locator('[data-model-id="gpt-4"]')).toHaveClass(/tl-dim/);

  await page.getByText("Hide others").click();
  await expect(page).toHaveURL(/hide=1/);
  await expect(page.locator('[data-model-id="gpt-4"]')).toHaveClass(/tl-gone/);
  await expect(page.locator('[data-model-id="llama-2"]')).not.toHaveClass(/tl-gone/);
});

test("type chips and the year slider filter the chart", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reasoning", exact: true }).click();
  await expect(page).toHaveURL(/type=reasoning/);
  await expect(page.locator('[data-model-id="gpt-3"]')).toHaveClass(/tl-dim/);

  const from = page.getByRole("slider", { name: "From year" });
  await from.focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/from=2023/);
});

test("a lab's card shows only that lab, and the shared row expands", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^OpenAI: 29 models/ }).click();
  await expect(page).toHaveURL(/org=openai/);
  await expect(page.locator('[data-model-id="claude-3"]')).toHaveClass(/tl-dim/);
  await expect(page.locator('[data-model-id="gpt-4"]')).not.toHaveClass(/tl-dim/);

  await page.getByRole("button", { name: /^Other labs:/ }).click();
  await expect(page.getByRole("button", { name: /^Microsoft:/ })).toBeVisible();
});

test("the year spacing can switch to calendar time", async ({ page }) => {
  await page.goto("/");
  const calendar = page.getByRole("radio", { name: "Calendar" });
  await calendar.click();
  await expect(calendar).toHaveAttribute("aria-checked", "true");
});

test("play replays history and can be paused", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-model-id="gpt-4"]')).not.toHaveClass(/tl-unborn/, { timeout: 5000 });
  await page.getByRole("button", { name: "Replay history from 2017" }).click();
  const pause = page.getByRole("button", { name: "Pause the replay" });
  await expect(pause).toBeVisible();
  await expect(page.locator('[data-model-id="gpt-6"]')).toHaveClass(/tl-unborn/);
  await pause.click();
  await expect(page.getByRole("button", { name: "Replay history from 2017" })).toBeVisible();
});

test("the explore page lists and sorts models", async ({ page }) => {
  await page.goto("/explore");
  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  await table.getByRole("button", { name: /^Model/ }).click();
  await expect(table.locator("tbody tr").first()).toContainText(/^[A-C]/);
});

test("the story page walks through the chapters", async ({ page }) => {
  await page.goto("/story");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("How we got here");
  await expect(page.getByRole("heading", { name: "Attention is all you need" })).toBeVisible();
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
