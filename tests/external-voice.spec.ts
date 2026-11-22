import { expect, test, type Page } from "@playwright/test";
import { fork, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
const namespace = "a".repeat(64);
const session = {
  enabled: true,
  configured: true,
  token: "fictional-token",
  cacheNamespace: namespace,
  sessionUsed: 0,
  limits: { session: 600, day: 1200, month: 3000 },
};
async function settings(page: Page) {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
}
async function mockAudio(page: Page) {
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
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [],
        addEventListener() {},
        removeEventListener() {},
        cancel() {},
        pause() {},
        resume() {},
      },
    });
  });
}
async function mockServer(page: Page, patch = {}) {
  await page.route("**/api/voice/session", (r) =>
    r.fulfill({ json: { ...session, ...patch } }),
  );
  await page.route("**/api/voice/cache/read", (r) =>
    r.fulfill({ status: 404, json: { code: "unavailable" } }),
  );
}
test("no provider request on launch/enable, consent resets and denied consent never synthesizes", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/voice")) calls.push(r.url());
  });
  await mockAudio(page);
  await mockServer(page);
  await settings(page);
  expect(calls).toEqual([]);
  await page.screenshot({
    path: "../../outputs/m2-step5/settings.png",
    fullPage: true,
  });
  await page.getByLabel(/Enable ElevenLabs for this visit/).check();
  expect(calls).toEqual([]);
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await expect(
    page.getByLabel(/Enable ElevenLabs for this visit/),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Test Frau Helga's voice" }).click();
  await expect(
    page.locator(".voice-controls").getByRole("status"),
  ).toContainText("Text-only");
  expect(calls.filter((u) => u.endsWith("/speak"))).toEqual([]);
});
for (const reason of ["disabled", "missing-key", "quota", "offline"])
  test(`voice failure ${reason} keeps text usable`, async ({ page }) => {
    await mockAudio(page);
    await mockServer(page, {
      enabled: reason !== "disabled",
      configured: reason !== "missing-key",
    });
    if (reason === "offline")
      await page.route("**/api/voice/session", (r) => r.abort());
    await page.route("**/api/voice/speak", (r) =>
      r.fulfill({ status: 429, json: { code: "quota" } }),
    );
    await settings(page);
    await page.getByLabel(/Enable ElevenLabs for this visit/).check();
    await page.getByRole("button", { name: "Test Frau Helga's voice" }).click();
    await expect(
      page.locator(".voice-controls").getByRole("status"),
    ).toContainText("Text-only");
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Classroom", exact: true })
      .click();
    await page.getByRole("button", { name: "Start lesson" }).click();
    await expect(page.locator("#answer")).toBeEnabled();
  });
test("local German fallback never selects remote and mute/pause/stop remain free", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as unknown as { spoken: string[]; paused: number };
    w.spoken = [];
    w.paused = 0;
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        voice: { voiceURI: string } | null = null;
      },
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [
          {
            lang: "de-AT",
            localService: false,
            voiceURI: "remote",
            name: "Remote",
          },
          {
            lang: "de-CH",
            localService: true,
            voiceURI: "local",
            name: "Local Swiss",
          },
        ],
        addEventListener() {},
        removeEventListener() {},
        cancel() {},
        pause() {
          w.paused++;
        },
        resume() {},
        speak(u: { voice: { voiceURI: string } }) {
          w.spoken.push(u.voice.voiceURI);
        },
      },
    });
  });
  await settings(page);
  await page.getByLabel("Preferred speaker").selectOption("local");
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/voice")) calls.push(r.url());
  });
  await page.getByRole("button", { name: "Test Frau Helga's voice" }).click();
  await expect(
    page.locator(".voice-controls").getByRole("status"),
  ).toContainText("installed local German");
  await page.getByRole("button", { name: "Pause voice", exact: true }).click();
  await page.getByRole("button", { name: "Resume voice", exact: true }).click();
  await page.getByRole("button", { name: "Stop voice", exact: true }).click();
  await page.getByLabel("Mute voice", { exact: true }).check();
  await expect(
    page.getByRole("button", { name: "Test Frau Helga's voice" }),
  ).toBeDisabled();
  expect(calls).toEqual([]);
  expect(
    await page.evaluate(
      () => (window as unknown as { spoken: string[] }).spoken,
    ),
  ).toEqual(["local"]);
});
test("real local server process restart preserves cached audio; browser download replays with zero requests offline", async ({
  page,
}, testInfo) => {
  await mockAudio(page);
  let child: ChildProcess | undefined;
  let port = 0;
  let synthesis = 0;
  async function start(disabled = false) {
    child = fork(
      resolve("tests/fixtures/cache-server.mjs"),
      [testInfo.outputPath("private-cache"), disabled ? "disabled" : "enabled"],
      { stdio: ["ignore", "ignore", "ignore", "ipc"] },
    );
    await new Promise<void>((res, rej) => {
      child!.on("error", rej);
      child!.on("message", (m: { port?: number; synthesis?: boolean }) => {
        if (m.synthesis) synthesis++;
        if (m.port) {
          port = m.port;
          res();
        }
      });
      child!.once("exit", (code) => {
        if (code) rej(Error("Mock voice server exited"));
      });
    });
  }
  async function stop() {
    if (child) {
      const c = child;
      await new Promise<void>((res) => {
        c.once("exit", () => res());
        c.send("stop");
      });
      child = undefined;
    }
  }
  try {
    await start();
    await page.route("**/api/voice/**", async (route) => {
      const response = await route.fetch({
        url: `http://127.0.0.1:${port}${new URL(route.request().url()).pathname}`,
        headers: {
          ...route.request().headers(),
          host: `127.0.0.1:${port}`,
          origin: "http://127.0.0.1:4173",
        },
      });
      await route.fulfill({ response });
    });
    await settings(page);
    await page.getByLabel(/Enable ElevenLabs for this visit/).check();
    await page.getByRole("button", { name: "Test Frau Helga's voice" }).click();
    await expect(
      page.locator(".voice-controls").getByRole("status"),
    ).toContainText("free credits may");
    expect(synthesis).toBe(1);
    await stop();
    await start(true); // Fresh OS process, live disabled, same private directory.
    await page.getByLabel(/Enable ElevenLabs for this visit/).uncheck();
    await page.getByRole("button", { name: "Test Frau Helga's voice" }).click();
    await expect(
      page.locator(".voice-controls").getByRole("status"),
    ).toContainText("Playing saved");
    expect(synthesis).toBe(1);
    await page.getByLabel(/Save permitted original lesson audio/).check();
    await page
      .getByRole("button", { name: "Download standard lesson clips" })
      .click();
    await expect(
      page.getByText(/Stored Frau Helga audio in browser: 1 clips/),
    ).toBeVisible();
    await stop();
    await page.reload();
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    const requests: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/voice")) requests.push(r.url());
    });
    await page.context().setOffline(true);
    await page.getByRole("button", { name: "Test Frau Helga's voice" }).click();
    await expect(
      page.locator(".voice-controls").getByRole("status"),
    ).toContainText("no network, no credits");
    expect(requests).toEqual([]);
    expect(synthesis).toBe(1);
    await page
      .getByRole("button", { name: "Pause voice", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Resume voice", exact: true })
      .click();
    await page.getByRole("button", { name: "Stop voice", exact: true }).click();
    await page.context().setOffline(false);
    await page.unroute("**/api/voice/**");
    await page.route("**/api/voice/**", (r) => r.abort());
    page.once("dialog", (d) => d.dismiss());
    await page.getByRole("button", { name: "Clear saved audio" }).click();
    await expect(
      page.getByText(/Stored Frau Helga audio in browser: 1 clips/),
    ).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Clear saved audio" }).click();
    await expect(
      page.getByText(/Stored Frau Helga audio in browser: 0 clips/),
    ).toBeVisible();
  } finally {
    await stop();
  }
});
test("Vite refuses private configuration and server source paths", async ({
  request,
}) => {
  for (const path of [
    "/private/.env.voice",
    "/server/index.ts",
    "/build/voice/server/index.js",
    "/private/voice-cache-v1/",
  ])
    expect((await request.get(path)).status()).toBe(403);
});
