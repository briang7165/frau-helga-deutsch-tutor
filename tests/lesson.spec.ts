import { expect, test, type Page } from "@playwright/test";
async function start(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start lesson" }).click();
}
async function answer(page: Page, value: string, last = false) {
  await page.getByRole("textbox").fill(value);
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page
    .getByRole("button", {
      name: last ? "Finish lesson" : "Next activity",
      exact: true,
    })
    .click();
}
test("completes all skills with actual scores and a report that is never sent", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (req) => {
    if (!req.url().startsWith("http://127.0.0.1:4173"))
      external.push(req.url());
  });
  await start(page);
  await answer(page, "a trip");
  await answer(page, "Nach Bonn.");
  await answer(page, "Ich gehe mit meinem Freund in den Park.");
  await answer(page, "fresh bread");
  await answer(page, "Ich fahre am Samstag mit dem Zug.");
  await answer(page, "Ich besuche meine Familie.", true);
  await expect(
    page.getByText("PREVIEW — NOT SENT", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("100% overall", { exact: true })).toBeVisible();
  expect(external).toEqual([]);
  const saved = await page.evaluate(() =>
    localStorage.getItem("frau-helga-progress-v2"),
  );
  expect(saved).not.toContain("Ich besuche");
  expect(saved).not.toContain("Blob");
  await page.reload();
  await expect(page.getByText("100% overall", { exact: true })).toBeVisible();
});
test("saves completed answers and elapsed time, reloads paused and resumes", async ({
  page,
}) => {
  await start(page);
  await answer(page, "a trip");
  await page.waitForTimeout(1100);
  await page.getByRole("button", { name: "Pause lesson" }).click();
  const before = await page.locator(".time strong").textContent();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Eine kleine Pause." }),
  ).toBeVisible();
  await expect(page.locator(".time strong")).toHaveText(before!);
  await page.getByRole("button", { name: "Continue lesson" }).click();
  await expect(
    page.getByRole("heading", { name: "Samstag am Fluss" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("frau-helga-progress-v2")!).current
          .attempts[0].score,
    ),
  ).toBe(100);
});
test("microphone denial and missing voices leave manual speaking usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        throw new DOMException("Denied", "NotAllowedError");
      },
    });
    Object.defineProperty(window, "speechSynthesis", { value: undefined });
  });
  await start(page);
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Skip activity" }).click();
  await page.getByRole("button", { name: "Hold to talk" }).focus();
  await page.keyboard.down("Space");
  await expect(
    page.getByText(/Microphone access denied or unavailable/),
  ).toBeVisible();
  await page.keyboard.up("Space");
  await expect(page.getByText(/No German voice found/)).toBeVisible();
  await answer(page, "Ich fahre am Samstag mit dem Zug.");
  await answer(page, "Ich besuche meine Familie.", true);
  await expect(page.getByText("100% overall", { exact: true })).toBeVisible();
});
test("storage corruption recovers and mobile layout does not overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    localStorage.setItem("frau-helga-progress-v2", "{bad"),
  );
  await start(page);
  await expect(page.getByRole("textbox")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-classroom.png",
    fullPage: true,
  });
});
test("desktop classroom and keyboard answer controls", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({
    path: "test-results/desktop-dashboard.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Start lesson" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "a trip", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox")).toHaveValue("a trip");
  await page.getByRole("button", { name: "Check answer", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Sehr gut. Das stimmt.")).toBeVisible();
  await page.screenshot({
    path: "test-results/desktop-classroom.png",
    fullPage: true,
  });
});
test("recording releases microphone tracks on pause and after a cancelled permission request", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const testWindow = window as unknown as {
      stopped: number;
      allowMic?: () => void;
      delayMic: boolean;
    };
    testWindow.stopped = 0;
    testWindow.delayMic = false;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        if (testWindow.delayMic)
          await new Promise<void>((resolve) => {
            testWindow.allowMic = resolve;
          });
        return {
          getTracks: () => [
            {
              stop: () => {
                testWindow.stopped++;
              },
            },
          ],
        };
      },
    });
    Object.defineProperty(window, "MediaRecorder", {
      value: class {
        state = "inactive";
        start() {
          this.state = "recording";
        }
        stop() {
          this.state = "inactive";
        }
      },
    });
  });
  await start(page);
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Skip activity" }).click();
  await page.getByRole("button", { name: "Hold to talk" }).focus();
  await page.keyboard.down("Space");
  await expect(
    page.getByRole("button", { name: "Recording — release to stop" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause lesson" }).click();
  await page.keyboard.up("Space");
  expect(
    await page.evaluate(
      () => (window as unknown as { stopped: number }).stopped,
    ),
  ).toBe(1);
  await page.getByRole("button", { name: "Continue lesson" }).click();
  await page.evaluate(() => {
    (window as unknown as { delayMic: boolean }).delayMic = true;
  });
  await page.getByRole("button", { name: "Hold to talk" }).focus();
  await page.keyboard.down("Space");
  await expect(page.getByText(/Requesting microphone access/)).toBeVisible();
  await page.keyboard.up("Space");
  await page.evaluate(() =>
    (window as unknown as { allowMic: () => void }).allowMic(),
  );
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { stopped: number }).stopped),
    )
    .toBe(2);
  await expect(
    page.getByRole("button", { name: "Hold to talk" }),
  ).toBeVisible();
});
test("unavailable storage warns without blocking a lesson", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await start(page);
  await expect(page.getByRole("alert")).toContainText(
    "Browser storage is unavailable",
  );
  await answer(page, "a trip");
  await expect(
    page.getByRole("heading", { name: "Samstag am Fluss" }),
  ).toBeVisible();
});
