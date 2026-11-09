import { expect, test, type Page } from "@playwright/test";
const progressKey = "frau-helga-progress-v2";
async function start(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start lesson", exact: true }).click();
}
async function skip(page: Page, n: number) {
  for (let i = 0; i < n; i++)
    await page
      .getByRole("button", { name: "Skip activity", exact: true })
      .click();
}
async function check(page: Page, text: string) {
  await page.locator("#answer").fill(text);
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
}
async function settings(page: Page) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Settings/ })
    .click();
}
test("English instructions precede the question and inputs have language-specific spellcheck", async ({
  page,
}) => {
  await start(page);
  await expect(page.locator(".instructions")).toContainText(
    "INSTRUCTIONS (ENGLISH)",
  );
  expect(
    await page
      .locator(".instructions")
      .evaluate(
        (el) =>
          !!(
            el.compareDocumentPosition(el.parentElement!.querySelector("h3")!) &
            Node.DOCUMENT_POSITION_FOLLOWING
          ),
      ),
  ).toBe(true);
  await expect(page.locator("#answer")).toHaveAttribute("lang", "en");
  await skip(page, 1);
  await expect(page.locator("#answer")).toHaveAttribute("lang", "de-DE");
  await expect(page.locator("#answer")).toHaveAttribute("spellcheck", "true");
  await settings(page);
  await page.getByLabel("German answer spellcheck", { exact: true }).uncheck();
  await page.getByLabel("Daily target (minutes)").fill("20");
  await page.getByLabel("Reduce motion", { exact: true }).check();
  await page.getByLabel("High contrast", { exact: true }).check();
  await page.reload();
  await settings(page);
  await expect(
    page.getByLabel("German answer spellcheck", { exact: true }),
  ).not.toBeChecked();
  await expect(page.getByLabel("Daily target (minutes)")).toHaveValue("20");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Classroom/ })
    .click();
  await page.getByRole("button", { name: "Continue lesson" }).click();
  await expect(page.locator("#answer")).toHaveAttribute("spellcheck", "false");
  await expect(page.locator(".time")).toContainText("20 min target");
});
test("word help is contextual, keyboard accessible, and does not submit or reveal the answer", async ({
  page,
}) => {
  await start(page);
  await skip(page, 1);
  await page.getByRole("button", { name: "Help", exact: true }).click();
  await page.getByLabel("German word lookup").fill("fährt");
  await page.getByLabel("German word lookup").press("Enter");
  await expect(page.getByRole("dialog")).toContainText(
    "travels / goes by vehicle",
  );
  await expect(page.getByRole("dialog")).not.toContainText("Nach Bonn.");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)!).current.attempts.length,
      progressKey,
    ),
  ).toBe(1);
  await check(page, "Nach Bonn.");
  await expect(page.getByText("Sehr gut. Das stimmt.")).toBeVisible();
  const saved = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!).current.attempts.at(-1),
    progressKey,
  );
  expect(saved.assisted).toBe(true);
  expect(saved.score).toBe(100);
});
test("selected-word lookup and answer withholding work without whole-paragraph translation", async ({
  page,
}) => {
  await start(page);
  await skip(page, 1);
  await page.locator("blockquote").evaluate((el) => {
    const text = el.firstChild!;
    const range = document.createRange();
    const content = text.textContent!;
    range.setStart(text, content.indexOf("fährt"));
    range.setEnd(text, content.indexOf("fährt") + 5);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await page.getByRole("button", { name: "Ask Frau Helga about this" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "travels / goes by vehicle",
  );
  await page.getByRole("button", { name: "Close word help" }).click();
  await page.getByRole("button", { name: "Help", exact: true }).click();
  await page.getByLabel("German word lookup").fill("Bonn");
  await page.getByRole("button", { name: "Look up word" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "gives away the graded answer",
  );
});
test("wrong case earns partial credit; unknown first responses stay unscored through retries", async ({
  page,
}) => {
  await start(page);
  await skip(page, 2);
  await check(page, "Ich gehe mit meinen Freund in den Park.");
  await expect(
    page.getByText("You have demonstrated part of this: 90%."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Check again" }).click();
  await expect(page.getByText(/Two separate questions:/)).toBeVisible();
  await page
    .getByRole("button", { name: "Next activity", exact: true })
    .click();
  await check(page, "Something plausible but not in the dictionary");
  await expect(
    page.getByText("Needs review — unscored", { exact: true }),
  ).toBeVisible();
  await page.locator("#answer").fill("fresh bread");
  await page.getByRole("button", { name: "Check again" }).click();
  await page
    .getByRole("button", { name: "Next activity", exact: true })
    .click();
  await skip(page, 2);
  await expect(page.getByText("90% overall", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "1/6 assessed · 1 needs review · 4 skipped · 0 missing · 0 assisted",
      { exact: true },
    ),
  ).toBeVisible();
});
test("mute and volume persist, reduced motion suppresses celebration, rewards do not change grades", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "AudioContext", {
      value: class {
        constructor() {
          throw Error("Muted sounds must not create AudioContext");
        }
      },
    });
  });
  await start(page);
  await settings(page);
  await page.getByLabel("Enable sound effects (off by default)").check();
  await page.getByLabel("Reduce motion", { exact: true }).check();
  await page.getByRole("button", { name: "Test sound" }).click();
  await page.getByLabel("Global sound effects volume").fill("10");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Unmute effects" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Global sound effects volume")).toHaveValue(
    "10",
  );
  await page.getByRole("button", { name: "Continue lesson" }).click();
  await check(page, "a trip");
  await expect(page.locator(".celebration span")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page
    .getByRole("button", { name: "Next activity", exact: true })
    .click();
  await skip(page, 5);
  await expect(page.getByText("100% overall", { exact: true })).toBeVisible();
  await expect(page.getByText("15 XP", { exact: true })).toBeVisible();
  await expect(page.locator(".celebration")).toContainText("practice star");
});
test("legacy progress migrates without overwriting M1 and survives navigation", async ({
  page,
}) => {
  const legacy = {
    version: 1,
    current: null,
    history: [
      {
        id: "legacy-fictional",
        index: 5,
        elapsedMs: 125000,
        completedAt: "2026-11-01T12:00:00Z",
        attempts: [
          { activityId: "v1", score: 100, kind: "correct" },
          { activityId: "r1", score: 0, kind: "unrecognized" },
        ],
      },
    ],
  };
  await page.addInitScript((data) => {
    if (!localStorage.getItem("frau-helga-m1-v1"))
      localStorage.setItem("frau-helga-m1-v1", JSON.stringify(data));
  }, legacy);
  await page.goto("/");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("frau-helga-m1-v1")!),
    ),
  ).toEqual(legacy);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /My progress/ })
    .click();
  await page.getByRole("button", { name: "View report" }).click();
  await expect(page.getByText(/Migrated M1 record/)).toBeVisible();
  await expect(page.getByText("100% overall", { exact: true })).toBeVisible();
  await page.reload();
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)!).history[0].elapsedMs,
      progressKey,
    ),
  ).toBe(125000);
});
test("weekly reminder starts a separate rotating assessment and reports a trend", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("frau-helga-m1-v1")) return;
    localStorage.setItem(
      "frau-helga-m1-v1",
      JSON.stringify({
        version: 1,
        current: null,
        history: Array.from({ length: 5 }, (_, i) => ({
          id: `f-${i}`,
          index: 5,
          elapsedMs: 1000,
          completedAt: new Date().toISOString(),
          attempts: [],
        })),
      }),
    );
  });
  await page.goto("/");
  await expect(
    page.getByText(/Your optional progress check is ready/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start progress check" }).click();
  await check(page, "train station");
  await page
    .getByRole("button", { name: "Next activity", exact: true })
    .click();
  await skip(page, 4);
  await expect(page.getByText(/First progress check recorded/)).toBeVisible();
  await expect(
    page.getByText(/Your optional progress check is ready/),
  ).not.toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /My progress/ })
    .click();
  await page.getByRole("button", { name: "Take a progress check" }).click();
  await expect(page.getByRole("heading", { name: /Fahrkarte/ })).toBeVisible();
  await check(page, "a suitcase");
  await page
    .getByRole("button", { name: "Next activity", exact: true })
    .click();
  await skip(page, 4);
  await expect(page.getByText(/Lower observed performance/)).toBeVisible();
  await expect(page.getByText("0% overall", { exact: true })).toBeVisible();
});
test("voice discovery includes local de-DE and remote de-AT, remote is blocked by default", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const voices = [
      {
        name: "Local German",
        voiceURI: "local-de",
        lang: "de-DE",
        localService: true,
      },
      {
        name: "Austrian remote",
        voiceURI: "remote-at",
        lang: "de-AT",
        localService: false,
      },
    ];
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => voices,
        addEventListener() {},
        removeEventListener() {},
        cancel() {},
        speak() {},
      },
    });
  });
  await page.goto("/");
  await settings(page);
  await expect(
    page.getByRole("option", { name: /Local German.*de-DE.*local/ }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("option", { name: /Austrian remote.*de-AT.*REMOTE/ }),
  ).toHaveCount(1);
  await page
    .getByLabel("German voice", { exact: true })
    .selectOption("remote-at");
  await expect(
    page.getByRole("button", { name: "Preview German voice" }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Allow selected remote browser voices"),
  ).not.toBeChecked();
  await page.reload();
  await settings(page);
  await expect(page.getByLabel("German voice", { exact: true })).toHaveValue(
    "remote-at",
  );
  await expect(
    page.getByRole("button", { name: "Preview German voice" }),
  ).toBeDisabled();
});
test("recording produces a consent-gated replay clip and discards all resources", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as unknown as {
      stops: number;
      revoked: number;
      plays: number;
    };
    w.stops = 0;
    w.revoked = 0;
    w.plays = 0;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => ({ getTracks: () => [{ stop: () => w.stops++ }] }),
    });
    Object.defineProperty(window, "MediaRecorder", {
      value: class {
        state = "inactive";
        mimeType = "audio/webm";
        ondataavailable?: (e: { data: Blob }) => void;
        onstop?: () => void;
        start() {
          this.state = "recording";
        }
        stop() {
          this.state = "inactive";
          this.ondataavailable?.({ data: new Blob(["fictional audio"]) });
          this.onstop?.();
        }
      },
    });
    const revoke = URL.revokeObjectURL;
    URL.revokeObjectURL = (url) => {
      w.revoked++;
      revoke(url);
    };
    HTMLMediaElement.prototype.play = async function () {
      w.plays++;
    };
    HTMLMediaElement.prototype.pause = function () {};
  });
  await start(page);
  await skip(page, 4);
  await page.getByRole("button", { name: "Hold to talk" }).focus();
  await page.keyboard.down("Space");
  await expect(
    page.getByRole("button", { name: "Recording — release to stop" }),
  ).toBeVisible();
  await page.keyboard.up("Space");
  await expect(
    page.getByRole("button", { name: "Replay my last clip" }),
  ).toBeDisabled();
  await page.getByLabel("Allow local replay of my diagnostic clips").check();
  await page.getByRole("button", { name: "Replay my last clip" }).click();
  expect(
    await page.evaluate(() => (window as unknown as { plays: number }).plays),
  ).toBe(1);
  expect(
    await page.evaluate(() => (window as unknown as { stops: number }).stops),
  ).toBe(1);
  await page.getByRole("button", { name: "Discard clip" }).click();
  await expect(
    page.getByRole("button", { name: "Replay my last clip" }),
  ).not.toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { revoked: number }).revoked,
    ),
  ).toBe(1);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "fictional audio",
  );
});
test("backup import validates, merges rather than erases, and exports no raw answers", async ({
  page,
}) => {
  await start(page);
  await check(page, "a trip");
  await page
    .getByRole("button", { name: "Next activity", exact: true })
    .click();
  await skip(page, 5);
  await settings(page);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export settings and progress" })
    .click();
  const file = await download;
  const path = await file.path();
  expect(path).toBeTruthy();
  await page
    .getByLabel("Import local backup")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from("{bad"),
    });
  await expect(page.getByText(/Import rejected:/)).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByLabel("Import local backup").setInputFiles(path!);
  await expect(
    page.getByText("Backup imported. Existing progress was preserved."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)!).history.length,
      progressKey,
    ),
  ).toBe(1);
});

test("enabled synthesized effects respond to volume and global mute immediately", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as unknown as {
      soundStarts: number;
      soundStops: number;
      gainValues: number[];
    };
    w.soundStarts = 0;
    w.soundStops = 0;
    w.gainValues = [];
    Object.defineProperty(window, "AudioContext", {
      value: class {
        currentTime = 0;
        destination = {};
        async resume() {}
        async close() {}
        createOscillator() {
          return {
            frequency: { setValueAtTime() {} },
            connect() {},
            disconnect() {},
            start() {
              w.soundStarts++;
            },
            stop() {
              w.soundStops++;
            },
          };
        }
        createGain() {
          return {
            gain: {
              setValueAtTime() {},
              linearRampToValueAtTime(v: number) {
                w.gainValues.push(v);
              },
              exponentialRampToValueAtTime() {},
            },
            connect() {},
            disconnect() {},
          };
        }
      },
    });
  });
  await page.goto("/");
  await settings(page);
  await page.getByLabel("Enable sound effects (off by default)").check();
  await page.getByRole("button", { name: "Unmute effects" }).click();
  await page.getByLabel("Global sound effects volume").fill("25");
  await page.getByRole("button", { name: "Test sound" }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { soundStarts: number }).soundStarts,
    ),
  ).toBe(1);
  expect(
    await page.evaluate(() =>
      (window as unknown as { gainValues: number[] }).gainValues.at(-1),
    ),
  ).toBe(0.02);
  await page.getByRole("button", { name: "Mute effects" }).click();
  await page.getByRole("button", { name: "Test sound" }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { soundStarts: number }).soundStarts,
    ),
  ).toBe(1);
});
test("restore defaults keeps an in-progress M1 migration intact", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("frau-helga-m1-v1"))
      localStorage.setItem(
        "frau-helga-m1-v1",
        JSON.stringify({
          version: 1,
          history: [],
          current: {
            id: "old-current",
            index: 2,
            attempts: [
              { activityId: "v1", score: 100, kind: "correct" },
              { activityId: "r1", score: 90, kind: "minor" },
            ],
            elapsedMs: 42000,
          },
        }),
      );
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Eine kleine Pause." }),
  ).toBeVisible();
  await settings(page);
  await page.getByLabel("Reduce motion", { exact: true }).check();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Restore defaults" }).click();
  await expect(
    page.getByLabel("Reduce motion", { exact: true }),
  ).not.toBeChecked();
  await page.reload();
  await page.getByRole("button", { name: "Continue lesson" }).click();
  await expect(
    page.getByRole("heading", { name: "Mit wem gehen Sie?" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)!).current.attempts.length,
      progressKey,
    ),
  ).toBe(2);
});
