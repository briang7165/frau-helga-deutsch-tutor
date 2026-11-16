import { expect, test, type Page } from "@playwright/test";
const example =
  "On Saturday Nora goes by train to Bonn. She visits her brother. At night she goes to the Rhein Space.";
async function reading(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start lesson" }).click();
  await page.getByRole("button", { name: "Skip for now", exact: true }).click();
}
for (const [width, height] of [
  [1100, 650],
  [1280, 720],
  [1366, 768],
  [1920, 1080],
  [390, 844],
]) {
  test(`classroom fits and progresses at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await reading(page);
    if (width >= 1100)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight,
        ),
      ).toBe(true);
    await page.screenshot({
      path: `../../outputs/qc-after-${width}.png`,
      fullPage: true,
    });
    await page.locator("#answer").fill(example);
    await page.locator("#answer").press("Control+Enter");
    const next = page.getByRole("button", { name: "Continue", exact: true });
    await expect(next).toBeFocused();
    await expect(page.locator(".feedback")).toContainText("60%");
    await expect(page.locator(".feedback")).toContainText(
      "afternoon, not at night",
    );
    await page.screenshot({
      path: `../../outputs/qc-after-feedback-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width >= 1100) {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight,
        ),
      ).toBe(true);
      const box = await next.boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);
    }
    await next.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Mit wem gehen Sie?" }),
    ).toBeFocused();
  });
}
test("draft, layout preferences and first score survive settings/help/pause without storing text", async ({
  page,
}) => {
  await reading(page);
  await page.locator("#answer").fill(example);
  await page.getByRole("button", { name: "Help", exact: true }).click();
  await expect(page.locator("#answer")).toHaveValue(example);
  await page.getByRole("button", { name: "Help", exact: true }).click();
  await page
    .getByRole("button", { name: "Comfortable layout", exact: true })
    .click();
  await page.getByRole("button", { name: "Expand navigation" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await expect(
    page.getByLabel("Compact classroom", { exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Classroom", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue lesson" }).click();
  await expect(page.locator("#answer")).toHaveValue(example);
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.locator("#answer").fill("Nach Bonn");
  await page.getByRole("button", { name: "Check again", exact: true }).click();
  const stored = await page.evaluate(() =>
    localStorage.getItem("frau-helga-progress-v2")!,
  );
  expect(stored).not.toContain(example);
  expect(
    JSON.parse(stored)
      .current.attempts.filter(
        (a: { activityId: string }) => a.activityId === "r1",
      )
      .map((a: { score: number }) => a.score),
  ).toEqual([60, 100]);
  await page.reload();
  await expect(page.locator(".nav-expanded.comfortable")).toBeVisible();
});
test("audio setup honestly separates four capabilities and requires sound opt-in", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [],
        addEventListener() {},
        removeEventListener() {},
        cancel() {},
      },
    }),
  );
  await reading(page);
  await page
    .getByText("Audio setup check · sounds, voice & microphone", {
      exact: true,
    })
    .click();
  const setup = page.locator(".classroom-tools .audio-setup");
  await expect(setup).toContainText("Sound effects: Off");
  await expect(setup).toContainText("No German voice found");
  await expect(setup).toContainText("Speech recognition: Not connected");
  await setup.getByRole("button", { name: "Enable gentle sounds" }).click();
  await expect(setup).toContainText("Sound effects: Available");
  await setup.getByRole("button", { name: "Test speaker" }).click();
  await expect(setup.getByRole("status")).toContainText(
    /Speaker tone|suspended/,
  );
});
test("200 percent equivalent reflow keeps controls reachable", async ({
  page,
}) => {
  // 1100x650 at 200% browser zoom gives a 550x325 CSS viewport.
  await page.setViewportSize({ width: 550, height: 325 });
  await reading(page);
  await page.locator("#answer").fill("Nach Bonn");
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mit wem gehen Sie?" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
