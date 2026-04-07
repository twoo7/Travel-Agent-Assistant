/**
 * Scenario 10 — No-context guard
 *
 * When a user navigates directly to /segments or /hotels without first
 * completing Trip Setup (so TripContext has zero legs), each page must
 * show a friendly "No trip set up yet." message and a back-link to /.
 *
 * Verified live 2026-04-06 against real backend at http://localhost:8000.
 */
import { test, expect } from "@playwright/test";

test.describe("no-context guard", () => {
  test("/segments shows guard message and back button", async ({ page }) => {
    // Hard-navigate → React re-mounts with empty TripContext
    await page.goto("/segments");

    await expect(page.getByText("No trip set up yet.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "← Go back to Trip Setup" })
    ).toBeVisible();
  });

  test("/hotels shows guard message and back button", async ({ page }) => {
    await page.goto("/hotels");

    await expect(page.getByText("No trip set up yet.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "← Go back to Trip Setup" })
    ).toBeVisible();
  });

  test("back button on /segments navigates to /", async ({ page }) => {
    await page.goto("/segments");
    await page.getByRole("button", { name: "← Go back to Trip Setup" }).click();
    await expect(page).toHaveURL("/");
  });

  test("back button on /hotels navigates to /", async ({ page }) => {
    await page.goto("/hotels");
    await page.getByRole("button", { name: "← Go back to Trip Setup" }).click();
    await expect(page).toHaveURL("/");
  });
});
