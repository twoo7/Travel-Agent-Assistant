/**
 * Scenario 3 — Transport mode selector availability (LHR → CDG)
 *
 * The Trip Setup form's multi-destination mode renders a TransportSelector
 * for each leg. Availability is computed client-side by getTransportAvailability()
 * in transportAvailability.ts using haversine distance + ISLAND_COUNTRIES set.
 *
 * Key observations for LHR (GB) → CDG (FR) — verified live 2026-04-06:
 *   - GB is in ISLAND_COUNTRIES → waterOnly = true
 *   - Train IS available: "🚂~3h by rail" button (Eurostar uses Channel Tunnel)
 *     label says "Train recommended — faster door-to-door than flying"
 *   - Ferry IS available: "⛴P&O Ferries · ~1h 30m crossing" button
 *   - Car NOT available: carAvailable = sameContinent && distanceKm < 600 && !waterOnly
 *     (waterOnly=true blocks car — no car button rendered)
 *   - Flight IS always available: "✈Flight" button
 *
 * AirportSearch is a combobox: type code → wait for dropdown → click the listitem.
 * Airport data loaded from frontend/src/data/airports.json (3 k entries).
 * Ferry routes from frontend/src/data/ferry_routes.json (dover-calais route).
 */
import { test, expect, type Page } from "@playwright/test";

/** Helper: fill an AirportSearch combobox and commit by clicking the dropdown option */
async function selectAirport(page: Page, textboxName: string, code: string, nth = 0) {
  const input = page.getByRole("textbox", { name: textboxName }).nth(nth);
  await input.fill(code);
  await page.locator("li").filter({ hasText: code }).first().click();
}

async function openMultiDestinationFormWithLHRtoCDG(page: Page) {
  await page.goto("/");

  // Enable multi-destination mode
  await page.getByRole("checkbox", { name: "Multi-destination trip" }).check();

  // Home airport: JFK
  await selectAirport(page, "Where are you flying from?", "JFK");

  // Leg 1 destination: LHR
  await selectAirport(page, "Destination airport", "LHR");

  // Leg 1 date
  await page.locator('input[type="date"]').first().fill("2026-06-01");

  // Add second leg — destination: CDG (origin auto-chains from LHR)
  await page.getByRole("button", { name: "+ Add destination" }).click();

  await selectAirport(page, "Destination airport", "CDG", 1);

  await page.locator('input[type="date"]').nth(1).fill("2026-06-05");

  // TransportSelector renders after destination is committed
}

test.describe("transport mode selector — LHR → CDG", () => {
  test("Train button is visible and available for LHR→CDG", async ({ page }) => {
    await openMultiDestinationFormWithLHRtoCDG(page);
    // Train button shows "🚂~3h by rail" for LHR→CDG
    const trainBtn = page.getByRole("button", { name: /🚂|rail/i }).last();
    await expect(trainBtn).toBeVisible();
    await expect(trainBtn).not.toBeDisabled();
  });

  test("Train is recommended with explanatory paragraph", async ({ page }) => {
    await openMultiDestinationFormWithLHRtoCDG(page);
    // "Train recommended — faster door-to-door than flying for this distance."
    await expect(
      page.getByText(/train recommended/i)
    ).toBeVisible();
  });

  test("Ferry button shows P&O Ferries crossing label for LHR→CDG", async ({ page }) => {
    await openMultiDestinationFormWithLHRtoCDG(page);
    // Ferry route: dover-calais, P&O Ferries, 90 min → "~1h 30m"
    const ferryBtn = page.getByRole("button", { name: /P&O Ferries/i });
    await expect(ferryBtn.last()).toBeVisible();
    // Also shows crossing duration
    const ferryLabel = page.getByRole("button", { name: /1h 30m/i });
    await expect(ferryLabel.last()).toBeVisible();
  });

  test("Car is not available for LHR→CDG (water-only crossing)", async ({ page }) => {
    await openMultiDestinationFormWithLHRtoCDG(page);
    // Car button should be absent — waterOnly=true blocks car for GB→FR
    const carBtn = page.getByRole("button", { name: /car|drive/i });
    // Either no car button OR it's disabled
    const carCount = await carBtn.count();
    if (carCount > 0) {
      await expect(carBtn.last()).toBeDisabled();
    }
    // Verify: no "drive" option rendered in the TransportSelector for this leg
    expect(carCount === 0 || (await carBtn.last().isDisabled())).toBe(true);
  });

  test("Flight is always available as an option", async ({ page }) => {
    await openMultiDestinationFormWithLHRtoCDG(page);
    // Flight button: "✈Flight"
    const flightBtn = page.getByRole("button", { name: /✈Flight/i }).last();
    await expect(flightBtn).toBeVisible();
    await expect(flightBtn).not.toBeDisabled();
  });
});
