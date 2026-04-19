/**
 * Persistence & trip sharing specs
 *
 * Prerequisites:
 *   - Backend running on :8000 with Redis (docker compose up -d redis)
 *   - Frontend running on :3000 (npm run dev)
 *
 * Scenarios:
 *   1. Trip state survives a page reload (localStorage + backend autosave)
 *   2. Opening a /t/[id] share link claims the trip and redirects to the funnel
 *   3. Deleting a trip from the dashboard removes it from the list
 */

import { test, expect, type BrowserContext } from "@playwright/test";
import path from "path";

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../PlaywrightTests/persistence"
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fillTripSetup(page: import("@playwright/test").Page) {
  await page.goto("/");

  // Home airport
  const fromInput = page.getByLabel("From");
  await fromInput.fill("JFK");
  await page.keyboard.press("Enter");

  // Destination
  const toInput = page.getByLabel("To");
  await toInput.fill("CDG");
  await page.keyboard.press("Enter");

  // Departure date — pick any future date
  const today = new Date();
  today.setDate(today.getDate() + 30);
  const dateStr = today.toISOString().split("T")[0];
  await page.locator('input[type="date"]').first().fill(dateStr);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("persistence", () => {
  test("trip state is restored after page reload", async ({ page }) => {
    await fillTripSetup(page);

    // Wait for the draft trip to be created (SaveTripButton shows "Draft" or "Trip saved")
    await expect(
      page.locator("text=Draft").or(page.locator("text=Trip saved"))
    ).toBeVisible({ timeout: 10_000 });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "01-before-reload.png"),
    });

    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // The form fields should be repopulated from localStorage
    // (home_origin in AirportSearch)
    await expect(page.locator("text=JFK")).toBeVisible({ timeout: 5_000 });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "02-after-reload.png"),
    });
  });

  test("share link loads trip in a second context", async ({ browser }) => {
    // First context: create a trip
    const ctxA: BrowserContext = await browser.newContext();
    const pageA = await ctxA.newPage();
    await fillTripSetup(pageA);

    // Wait for activeTripId to appear in localStorage
    let tripId: string | null = null;
    await expect
      .poll(
        async () => {
          const raw = await pageA.evaluate(() =>
            localStorage.getItem("trip-context:draft")
          );
          if (!raw) return null;
          try {
            const s = JSON.parse(raw) as { activeTripId?: string };
            tripId = s.activeTripId ?? null;
            return tripId;
          } catch {
            return null;
          }
        },
        { timeout: 15_000, intervals: [500] }
      )
      .not.toBeNull();

    await pageA.screenshot({
      path: path.join(SCREENSHOTS_DIR, "03-owner-trip-created.png"),
    });

    // Second context: open the share URL
    const ctxB: BrowserContext = await browser.newContext();
    const pageB = await ctxB.newPage();
    await pageB.goto(`/t/${tripId}`);

    // Should redirect into the funnel (/, /segments, or /itinerary)
    await expect(pageB).not.toHaveURL(/\/t\//);

    await pageB.screenshot({
      path: path.join(SCREENSHOTS_DIR, "04-sharer-loaded.png"),
    });

    await ctxA.close();
    await ctxB.close();
  });

  test("deleting a trip removes it from the dashboard", async ({ page }) => {
    await page.goto("/trips");
    await page.waitForLoadState("networkidle");

    const cards = page.locator('[class*="rounded-2xl"][class*="cursor-pointer"]');
    const initialCount = await cards.count();

    if (initialCount === 0) {
      // No trips to delete — create one first then come back
      await fillTripSetup(page);
      await page.waitForTimeout(2000); // allow autosave
      await page.goto("/trips");
      await page.waitForLoadState("networkidle");
    }

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "05-dashboard-before-delete.png"),
    });

    const firstDeleteBtn = page.getByRole("button", { name: "Delete trip" }).first();
    await firstDeleteBtn.click();

    // Give the API call time to resolve
    await page.waitForTimeout(1000);

    const newCount = await cards.count();
    expect(newCount).toBeLessThan(initialCount === 0 ? 1 : initialCount);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "06-dashboard-after-delete.png"),
    });
  });
});
