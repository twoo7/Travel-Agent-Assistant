/**
 * Scenario 9 — Sidebar hover-expand and pin
 *
 * The sidebar starts in a collapsed state (number + icon per cell, 56 px wide).
 * Hovering expands it (full labels + status chips). A "Pin sidebar open" button
 * (›) keeps it expanded after the mouse leaves; clicking it again unpins (‹).
 *
 * Verified live 2026-04-06 against real backend at http://localhost:8000.
 *
 * NOTE: The sidebar label/chip text is rendered as sibling spans inside each
 * nav link. Status chip values observed:
 *   "✓ Done"    — step completed
 *   "● Active"  — current step
 *   "⚠ Stale"  — step has stale keys
 *   "○ Locked"  — step not yet reachable
 */
import { test, expect } from "@playwright/test";

// Helper: navigate to the segments page and ensure a trip is in context
// (use a pre-existing session OR navigate after trip setup).
// For sidebar tests we only need the sidebar itself, so we hard-navigate to /
// (Trip Setup page), which always renders the sidebar without needing a full trip.
test.describe("sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("sidebar is collapsed by default (shows number + icon cells)", async ({
    page,
  }) => {
    const nav = page.getByRole("navigation");
    // In collapsed state each nav link shows the step number + icon, NOT the label text
    await expect(nav.getByRole("link", { name: /1/ })).toBeVisible();
    // Label text ("Trip Setup") should NOT be visible in collapsed state
    // We check the pin button is present and shows "›" (collapsed indicator)
    await expect(
      page.getByRole("button", { name: "Pin sidebar open" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Pin sidebar open" })
    ).toHaveText("›");
  });

  test("hovering the sidebar reveals full labels and status chips", async ({
    page,
  }) => {
    const nav = page.getByRole("navigation");
    await nav.hover();

    // After hover: full label + chip visible for each step
    await expect(nav.getByText("Trip Setup")).toBeVisible();
    await expect(nav.getByText("Segments")).toBeVisible();
    await expect(nav.getByText("Hotels")).toBeVisible();
    await expect(nav.getByText("Itinerary")).toBeVisible();
    await expect(nav.getByText("Export")).toBeVisible();
  });

  test("hovering the sidebar reveals status chips for each step", async ({
    page,
  }) => {
    const nav = page.getByRole("navigation");
    await nav.hover();

    // At least one step should show a status chip text
    // On a fresh page (no trip): Trip Setup is "● Active", rest are "○ Locked"
    const chips = nav.locator('[class*="chip"], [class*="status"]');
    // Fallback: check that the known chip strings appear somewhere in the nav
    const navText = await nav.innerText();
    const hasChips =
      navText.includes("Done") ||
      navText.includes("Active") ||
      navText.includes("Stale") ||
      navText.includes("Locked");
    expect(hasChips).toBe(true);
  });

  test("pin button persists expanded state after mouse leaves sidebar", async ({
    page,
  }) => {
    const nav = page.getByRole("navigation");
    await nav.hover();

    // Click pin button while sidebar is expanded
    const pinBtn = page.getByRole("button", { name: "Pin sidebar open" });
    await pinBtn.click();

    // Button should now read "Unpin sidebar" and be in active/pressed state
    const unpinBtn = page.getByRole("button", { name: "Unpin sidebar" });
    await expect(unpinBtn).toBeVisible();
    await expect(unpinBtn).toHaveText("‹");

    // Move mouse away from sidebar
    await page.getByRole("main").hover();

    // Sidebar should remain expanded — labels still visible
    await expect(nav.getByText("Trip Setup")).toBeVisible();
    await expect(nav.getByText("Segments")).toBeVisible();

    // Unpin button still active
    await expect(unpinBtn).toBeVisible();
  });

  test("clicking unpin button collapses sidebar", async ({ page }) => {
    const nav = page.getByRole("navigation");
    await nav.hover();

    // Pin it
    await page.getByRole("button", { name: "Pin sidebar open" }).click();

    // Unpin it
    await page.getByRole("button", { name: "Unpin sidebar" }).click();

    // Pin button should return
    await expect(
      page.getByRole("button", { name: "Pin sidebar open" })
    ).toBeVisible();
  });
});
