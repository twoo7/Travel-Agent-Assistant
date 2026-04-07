/**
 * Scenario 4 — Multi-destination mode
 *
 * The Trip Setup page has a "Multi-destination trip" checkbox that toggles between:
 *   - Single-destination mode: one origin, one destination, one date
 *   - Multi-destination mode: a list of LegRow components with +/- add/remove
 *
 * Multi-destination mode behaviours verified live 2026-04-06:
 *   1. Checking the checkbox reveals the leg list (LegRow components)
 *   2. Home airport field: textbox "Where are you flying from?"
 *   3. Each leg has "Origin airport" (disabled) and "Destination airport" inputs
 *   4. Leg 1 "Origin airport" is auto-filled from home airport (disabled)
 *   5. Each subsequent leg's "Origin airport" is disabled and auto-chained from previous "To"
 *   6. A TransportSelector appears for each leg after destination is set
 *      — buttons: "✈Flight", "🚂~3h by rail", "⛴P&O Ferries · ~1h 30m crossing" (for LHR→CDG)
 *   7. "+" Add destination button appends a new LegRow
 *   8. Submitting with a non-flight mode (e.g., train) passes transport_mode to TripContext
 *   9. On /segments, non-flight legs are auto-confirmed and show their card variant
 *
 * AirportSearch is a combobox: type code → wait for dropdown → click the listitem.
 *
 * Trip used: JFK → LHR (flight) → CDG (train, 2026-06-05)
 */
import { test, expect, type Page } from "@playwright/test";

/** Helper: fill an AirportSearch combobox and commit by clicking the dropdown option */
async function selectAirport(page: Page, textboxName: string, code: string, nth = 0) {
  const input = page.getByRole("textbox", { name: textboxName }).nth(nth);
  await input.fill(code);
  // Wait for dropdown listitem with the IATA code badge and click it
  await page.locator("li").filter({ hasText: code }).first().click();
}

test.describe("multi-destination mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("multi-destination checkbox toggles leg list", async ({ page }) => {
    const checkbox = page.getByRole("checkbox", { name: "Multi-destination trip" });
    await checkbox.check();
    // Leg destination input should appear
    await expect(
      page.getByRole("textbox", { name: "Destination airport" }).first()
    ).toBeVisible();
  });

  test("leg 1 From field auto-fills from home airport and is disabled", async ({
    page,
  }) => {
    const checkbox = page.getByRole("checkbox", { name: "Multi-destination trip" });
    await checkbox.check();

    // Fill home airport
    await selectAirport(page, "Where are you flying from?", "JFK");

    // Leg 1 "Origin airport" should be disabled and non-empty (auto-filled from JFK)
    const originInput = page.getByRole("textbox", { name: "Origin airport" }).first();
    await expect(originInput).toBeDisabled();
    const val = await originInput.inputValue();
    expect(val).not.toBe("");
  });

  test("add another leg button appends a new leg row", async ({ page }) => {
    const checkbox = page.getByRole("checkbox", { name: "Multi-destination trip" });
    await checkbox.check();

    // Fill home airport
    await selectAirport(page, "Where are you flying from?", "JFK");

    // Fill Leg 1 destination
    await selectAirport(page, "Destination airport", "LHR");

    // Fill Leg 1 date
    await page.locator('input[type="date"]').first().fill("2026-06-01");

    // Count destination inputs before
    const destInputs = page.getByRole("textbox", { name: "Destination airport" });
    const countBefore = await destInputs.count();

    await page.getByRole("button", { name: "+ Add destination" }).click();

    const countAfter = await destInputs.count();
    expect(countAfter).toBeGreaterThan(countBefore);
  });

  test("leg 2 From is auto-chained from leg 1 destination (disabled)", async ({
    page,
  }) => {
    const checkbox = page.getByRole("checkbox", { name: "Multi-destination trip" });
    await checkbox.check();

    await selectAirport(page, "Where are you flying from?", "JFK");
    await selectAirport(page, "Destination airport", "LHR");

    await page.locator('input[type="date"]').first().fill("2026-06-01");

    await page.getByRole("button", { name: "+ Add destination" }).click();

    // Leg 2 "Origin airport" should be disabled and contain "Heathrow" (chained from LHR)
    const leg2Origin = page.getByRole("textbox", { name: "Origin airport" }).nth(1);
    await expect(leg2Origin).toBeDisabled();
    // Wait for the useEffect in AirportSearch to populate the chained origin
    await expect(leg2Origin).not.toHaveValue("");
    const val = await leg2Origin.inputValue();
    expect(val).toContain("Heathrow");
  });

  test("selecting train for leg 2 and submitting shows train card on segments page", async ({
    page,
  }) => {
    const checkbox = page.getByRole("checkbox", { name: "Multi-destination trip" });
    await checkbox.check();

    await selectAirport(page, "Where are you flying from?", "JFK");
    await selectAirport(page, "Destination airport", "LHR");
    await page.locator('input[type="date"]').first().fill("2026-06-01");

    await page.getByRole("button", { name: "+ Add destination" }).click();

    await selectAirport(page, "Destination airport", "CDG", 1);
    await page.locator('input[type="date"]').nth(1).fill("2026-06-05");

    // Select Train for leg 2 — button shows "🚂~3h by rail"
    const trainBtn = page.getByRole("button", { name: /🚂|rail/i });
    if ((await trainBtn.count()) > 0) {
      await trainBtn.last().click();
    }

    await page.getByRole("button", { name: /start planning/i }).click();
    await page.waitForURL("/segments");

    // Leg 2 should appear as a train segment (confirmed immediately)
    await expect(page.getByText(/train/i).first()).toBeVisible();
    await expect(page.getByText(/confirmed/i).first()).toBeVisible();
  });

  test("progress bar shows partial confirmation on segments page (train confirmed, flight pending)", async ({
    page,
  }) => {
    const checkbox = page.getByRole("checkbox", { name: "Multi-destination trip" });
    await checkbox.check();

    await selectAirport(page, "Where are you flying from?", "JFK");
    await selectAirport(page, "Destination airport", "LHR");
    await page.locator('input[type="date"]').first().fill("2026-06-01");

    await page.getByRole("button", { name: "+ Add destination" }).click();

    await selectAirport(page, "Destination airport", "CDG", 1);
    await page.locator('input[type="date"]').nth(1).fill("2026-06-05");

    const trainBtn = page.getByRole("button", { name: /🚂|rail/i });
    if ((await trainBtn.count()) > 0) {
      await trainBtn.last().click();
    }

    await page.getByRole("button", { name: /start planning/i }).click();
    await page.waitForURL("/segments");

    // 1 of 2 legs confirmed (train auto-confirmed, flight still needs selection)
    await expect(page.getByText(/1 of 2 legs confirmed/i)).toBeVisible();

    // "Continue to Hotels" should be disabled
    await expect(
      page.getByRole("button", { name: /continue to hotels/i })
    ).toBeDisabled();
  });
});
