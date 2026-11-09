import { expect, test } from "@playwright/test";
const openSettings = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Settings/ })
    .click();
};
test("external voice is off after load/reload and enabling alone makes no API request", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/voice")) calls.push(r.url());
  });
  await openSettings(page);
  await expect(
    page.getByRole("button", { name: "Test Frau Helga's voice" }),
  ).toBeDisabled();
  await page.getByLabel(/Enable ElevenLabs for this visit/).check();
  expect(calls).toEqual([]);
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Settings/ })
    .click();
  await expect(
    page.getByLabel(/Enable ElevenLabs for this visit/),
  ).not.toBeChecked();
  expect(calls).toEqual([]);
});
test("disabled server and upstream quota errors offer local or text fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", { value: undefined });
  });
  await page.route("**/api/voice/session", (route) =>
    route.fulfill({
      json: { enabled: false, configured: true, token: "fictional-token" },
    }),
  );
  await openSettings(page);
  await page.getByLabel(/Enable ElevenLabs for this visit/).check();
  await page.getByRole("button", { name: "Test Frau Helga's voice" }).click();
  await expect(
    page.getByText(
      /External voice is disabled on the server.*Text-only fallback/,
    ),
  ).toBeVisible();
  await page.route("**/api/voice/session", (route) =>
    route.fulfill({
      json: { enabled: true, configured: true, token: "fictional-token" },
    }),
  );
  await page.route("**/api/voice/speak", (route) =>
    route.fulfill({ status: 429, json: { code: "quota" } }),
  );
  await page.getByRole("button", { name: "Test Frau Helga's voice" }).click();
  await expect(page.getByText(/usage limit.*Text-only fallback/)).toBeVisible();
});
test("custom playback is explicit, same-origin, pausable and stopped when consent is disabled", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as unknown as { plays: number; pauses: number };
    w.plays = 0;
    w.pauses = 0;
    Object.defineProperty(window, "Audio", {
      value: class {
        volume = 0;
        playbackRate = 1;
        async play() {
          w.plays++;
        }
        pause() {
          w.pauses++;
        }
      },
    });
  });
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/voice/session", (route) =>
    route.fulfill({
      json: { enabled: true, configured: true, token: "fictional-session" },
    }),
  );
  await page.route("**/api/voice/speak", (route) => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({
      contentType: "audio/mpeg",
      body: Buffer.from([73, 68, 51]),
      headers: { "X-Voice-Cache": "hit" },
    });
  });
  await openSettings(page);
  await page.getByLabel(/Enable ElevenLabs for this visit/).check();
  await page.getByRole("button", { name: "Test Frau Helga's voice" }).click();
  await expect(page.getByText(/session-cached voice clip/)).toBeVisible();
  expect(requests).toEqual([
    { text: "Guten Tag. Wir lernen Schritt für Schritt.", consent: true },
  ]);
  await page
    .getByRole("button", { name: "Pause custom voice", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Resume custom voice", exact: true })
    .click();
  expect(
    await page.evaluate(() => (window as unknown as { plays: number }).plays),
  ).toBe(2);
  await page.getByLabel(/Enable ElevenLabs for this visit/).uncheck();
  await expect(
    page.getByRole("button", { name: "Test Frau Helga's voice" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() => (window as unknown as { pauses: number }).pauses),
  ).toBeGreaterThan(0);
});
test("Vite refuses private configuration and server source paths", async ({
  request,
}) => {
  for (const path of [
    "/private/.env.voice",
    "/server/index.ts",
    "/build/voice/server/index.js",
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(403);
  }
});
