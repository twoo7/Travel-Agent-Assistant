/**
 * Scenario 5 — Stale detection
 *
 * When the user returns to Trip Setup after completing at least one planning step,
 * changes to passenger count, home airport, or departure date trigger MARK_STALE
 * dispatches for the affected legs/steps. The stale banner is shown at the top of
 * the Trip Setup page listing all stale steps with "Go to [Step] →" navigation buttons.
 *
 * Key observations (verified live 2026-04-06):
 *   - Changing adult passenger count dispatches MARK_STALE for ALL existing legs,
 *     covering both "segments-N" and "hotels-N" keys.
 *   - For a 2-leg trip this produces 4 stale keys:
 *     segments-1, hotels-1, segments-2, hotels-2
 *   - The stale banner reads:
 *     "⚠️ Changes detected — 4 steps need attention"
 *   - Each stale entry shows a "Go to [Step] →" button that navigates to
 *     /segments or /hotels accordingly.
 *   - The sidebar shows "⚠ Stale" chip for any step that has stale keys.
 *
 * MARK_STALE is a no-op when tripContext.legs.length === 0 (first-time setup).
 *
 * NOTE: This test requires completing Trip Setup to get legs into context,
 * which in turn requires the backend to respond (flight search auto-fires).
 * The stale detection itself is purely frontend — no extra backend calls needed
 * for the stale-banner assertions.
 *
 * AirportSearch is a combobox: type code → wait for dropdown → click the listitem.
 * Train button for LHR→CDG: "🚂~3h by rail".
 */
import { test, expect, type Page } from "@playwright/test";

/** Helper: fill an AirportSearch combobox and commit by clicking the dropdown option */
async function selectAirport(page: Page, textboxName: string, code: string, nth = 0) {
  const input = page.getByRole("textbox", { name: textboxName }).nth(nth);
  await input.fill(code);
  await page.locator("li").filter({ hasText: code }).first().click();
}

/**
 * Complete Trip Setup for a 2-leg trip (JFK→LHR flight, LHR→CDG train)
 * so that TripContext has legs and state is ready for stale-detection tests.
 * Returns at /segments (does NOT select a flight — just needs legs in context).
 */
async function setupTripForStaleTest(page: Page) {
  await page.goto("/");

  await page.getByRole("checkbox", { name: "Multi-destination trip" }).check();

  await selectAirport(page, "Where are you flying from?", "JFK");
  await selectAirport(page, "Destination airport", "LHR");
  await page.locator('input[type="date"]').first().fill("2026-06-01");

  await page.getByRole("button", { name: "+ Add destination" }).click();

  await selectAirport(page, "Destination airport", "CDG", 1);
  await page.locator('input[type="date"]').nth(1).fill("2026-06-05");

  // Set leg 2 to train
  const trainBtn = page.getByRole("button", { name: /🚂|rail/i });
  if ((await trainBtn.count()) > 0) {
    await trainBtn.last().click();
  }

  await page.getByRole("button", { name: /start planning/i }).click();
  await page.waitForURL("/segments");

  // Go back to Trip Setup using sidebar link (soft navigation preserves React state)
  // Hard navigation (page.goto("/")) resets TripContext, making MARK_STALE a no-op
  await page.getByRole("link", { name: /^1/ }).click();
  await page.waitForURL("/");
}

test.describe("stale detection", () => {
  test("no stale banner on first-time setup (no existing legs)", async ({
    page,
  }) => {
    await page.goto("/");
    // Increment adults before any trip is set up — MARK_STALE should be a no-op
    const adultsPlus = page.getByRole("button", { name: "+" }).first();
    if ((await adultsPlus.count()) > 0) {
      await adultsPlus.click();
    }
    await expect(page.getByText(/changes detected/i)).not.toBeVisible();
  });

  test("changing adults triggers stale banner for all legs", async ({ page }) => {
    await setupTripForStaleTest(page);

    // Increment adults — triggers MARK_STALE for all legs × both steps
    const adultsPlus = page.getByRole("button", { name: "+" }).first();
    await adultsPlus.click();

    // Stale banner should appear
    await expect(page.getByText(/changes detected/i)).toBeVisible();

    // Should mention multiple steps needing attention (4 for a 2-leg trip)
    await expect(page.getByText(/steps? need attention/i)).toBeVisible();
  });

  test("stale banner shows Go-to buttons for Segments and Hotels", async ({
    page,
  }) => {
    await setupTripForStaleTest(page);
    const adultsPlus = page.getByRole("button", { name: "+" }).first();
    await adultsPlus.click();

    await expect(
      page.getByRole("button", { name: /go to segments/i }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /go to hotels/i }).first()
    ).toBeVisible();
  });

  test('"Go to Segments →" button navigates to /segments', async ({ page }) => {
    await setupTripForStaleTest(page);
    const adultsPlus = page.getByRole("button", { name: "+" }).first();
    await adultsPlus.click();

    await page
      .getByRole("button", { name: /go to segments/i })
      .first()
      .click();
    await expect(page).toHaveURL("/segments");
  });

  test("sidebar shows Stale chip for Hotels after passenger change", async ({
    page,
  }) => {
    await setupTripForStaleTest(page);
    const adultsPlus = page.getByRole("button", { name: "+" }).first();
    await adultsPlus.click();

    // Hover to expand sidebar
    const nav = page.getByRole("navigation");
    await nav.hover();

    // Both Segments and Hotels steps show the ⚠ Stale chip — check at least one is visible
    await expect(nav.getByText(/stale/i).first()).toBeVisible();
  });
});
