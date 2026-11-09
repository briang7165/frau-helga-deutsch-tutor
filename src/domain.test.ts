import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activities,
  assessmentActivities,
  assessmentDue,
  breakdown,
  emptyState,
  grade,
  remediation,
  report,
  rewards,
  score,
  streak,
  trend,
  unscored,
  type Session,
} from "./domain";
import {
  decodeState,
  legacyKey,
  localProgressRepository as storage,
  storageKey,
} from "./persistence";
import { defaults, validateSettings } from "./preferences";
import { localWordHelp } from "./WordHelp";
import { SoundPlayer } from "./sounds";
import { browserSpeechProvider } from "./providers";
const session = (): Session => ({
  id: "fictional-test",
  index: 0,
  attempts: [],
  elapsedMs: 0,
  mode: "practice",
  variant: 0,
  targetMinutes: 30,
});
const finished = (
  id: string,
  date: string,
  mode: "practice" | "assessment" = "practice",
): Session => ({ ...session(), id, completedAt: date, mode });
afterEach(() => vi.unstubAllGlobals());
describe("activity-specific, explainable rubrics", () => {
  it("accepts every model across daily practice and all assessment variants", () => {
    for (const a of [
      ...activities,
      ...[0, 1, 2, 3].flatMap(assessmentActivities),
    ])
      expect(grade(a, a.model).score, a.id).toBe(100);
  });
  it.each([
    ["Ich gehe mit meiner Freundin in den Park.", 100],
    ["Ich gehe in den Park mit meinem Freund.", 100],
    ["Ich gehe mit meinen Freund in den Park.", 90],
    ["Ich gehe mit Freund in den Park.", 90],
    ["ich gehe mit meinem freund in den park", 97],
    ["Ich gehe mit meinem Freun in den Park.", 97],
    ["Ich gehen mit meinem Freund in den Park.", 85],
    ["Ich mit meinem Freund gehe in den Park.", 82],
  ])("grades constrained writing %s as %s", (answer, expected) => {
    const r = grade(activities[2], answer);
    expect(r.score).toBe(expected);
    expect(r.rubric_parts.reduce((n, p) => n + p.awarded, 0)).toBe(expected);
    expect(r.rubric_parts.reduce((n, p) => n + p.possible, 0)).toBe(100);
  });
  it("accepts synonyms and recognizes minor spelling", () => {
    expect(grade(activities[0], "an outing").score).toBe(100);
    expect(grade(activities[1], "Nach Bon.").score).toBe(95);
  });
  it("does not turn unfamiliar grammatical answers or negation into numeric judgments", () => {
    for (const value of [
      "Am Sonntag lese ich.",
      "Ich gehe nicht mit meinem Freund in den Park.",
      "Ich gehe mit der Freundin in den Park.",
      "Ich spaziere mit meinem Freund in den Park.",
    ]) {
      const a = value.startsWith("Am") ? activities[5] : activities[2];
      expect(grade(a, value).status).toBe("needs_review");
      expect(grade(a, value).score).toBeNull();
    }
  });
  it("recognizes incompatible meaning in constrained exercises", () => {
    expect(grade(activities[0], "a suitcase").status).toBe("incorrect");
    expect(grade(activities[1], "Nach Berlin.").score).toBe(0);
  });
  it("gives speaking text credit only, with no pronunciation claim", () => {
    const a = grade(activities[5], "Ich lese ein Buch");
    expect(a.score).toBe(100);
    expect(a.error_tags).not.toContain("pronunciation");
  });
  it("excludes skipped and review items and preserves first attempts", () => {
    const s = session();
    s.attempts = [
      grade(activities[0], "a suitcase"),
      grade(activities[0], "a trip"),
      grade(activities[1], "Nach Bonn."),
      unscored(activities[2], "needs_review"),
      unscored(activities[3], "skipped"),
    ];
    expect(score(s)).toBe(50);
    expect(breakdown(s)).toMatchObject({
      assessed: 2,
      needsReview: 1,
      skipped: 1,
      missing: 2,
    });
    expect(score(s, "speaking")).toBeNull();
  });
  it("adds assistance metadata without a grade penalty", () => {
    const r = grade(activities[2], activities[2].model, true);
    expect(r.assisted).toBe(true);
    expect(r.score).toBe(100);
  });
  it("changes explanations after repeated mistakes", () => {
    const a = activities[2],
      r = grade(a, "Ich gehe mit meinen Freund in den Park.");
    expect(remediation(a, [r])).toContain(a.rule);
    expect(remediation(a, [r, r])).toContain(a.alternative);
  });
  it("reports assessed denominators and evidence-based recommendations", () => {
    const s = session();
    s.attempts = [
      grade(activities[0], "a trip"),
      unscored(activities[1], "needs_review"),
    ];
    const r = report(s);
    expect(r.status).toBe("PREVIEW — NOT SENT");
    expect(r.assessed).toBe(1);
    expect(r.needsReview).toBe(1);
    expect(r.strengths).toEqual([activities[0].title]);
    expect(r.goals.length).toBeGreaterThan(0);
  });
});
describe("non-destructive migration and validation", () => {
  const legacy = {
    version: 1,
    current: null,
    history: [
      {
        id: "old-fictional",
        index: 5,
        elapsedMs: 123000,
        completedAt: "2026-11-01T12:00:00Z",
        attempts: [
          { activityId: "v1", kind: "correct", score: 100 },
          { activityId: "w1", kind: "major", score: 0 },
          { activityId: "r1", kind: "unrecognized", score: 0 },
          { activityId: "l1", kind: "skipped", score: 0 },
        ],
      },
    ],
  };
  it("retains M1 identity, time, assessed scores and original zero metadata", () => {
    const s = decodeState(JSON.stringify(legacy));
    expect(s.version).toBe(2);
    expect(s.history[0].elapsedMs).toBe(123000);
    expect(s.history[0].attempts.map((a) => a.score)).toEqual([
      100,
      0,
      null,
      null,
    ]);
    expect(s.history[0].attempts[2].legacyScore).toBe(0);
  });
  it("writes v2 without changing the original key", () => {
    const data = new Map([[legacyKey, JSON.stringify(legacy)]]);
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k, v),
      removeItem: (k: string) => data.delete(k),
    });
    const s = storage.load();
    expect(storage.save(s)).toBe(true);
    expect(data.get(legacyKey)).toBe(JSON.stringify(legacy));
    expect(data.has(storageKey)).toBe(true);
  });
  it("preserves unreadable data and refuses automatic overwrites", () => {
    const data = new Map([[storageKey, "{broken"]]);
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k, v),
    });
    storage.load();
    expect(storage.save(emptyState())).toBe(false);
    expect(data.get(storageKey)).toBe("{broken");
  });
  it("scrubs unknown raw fields and regenerates rubric text on import", () => {
    const s = session();
    s.attempts = [grade(activities[0], "a trip")];
    const raw = {
      ...emptyState(),
      current: {
        ...s,
        transcript: "PRIVATE TEXT",
        attempts: s.attempts.map((a) => ({
          ...a,
          answer: "PRIVATE TEXT",
          rubric_parts: a.rubric_parts.map((p) => ({
            ...p,
            message: "PRIVATE TEXT",
          })),
        })),
      },
    };
    expect(JSON.stringify(decodeState(JSON.stringify(raw)))).not.toContain(
      "PRIVATE TEXT",
    );
  });
  it.each([
    "null",
    "{}",
    "{bad",
    JSON.stringify({ version: 9, current: null, history: [] }),
    JSON.stringify({ ...emptyState(), current: { ...session(), index: 99 } }),
  ])("rejects invalid backups %s", (raw) =>
    expect(() => decodeState(raw)).toThrow(),
  );
  it("rejects mismatched numeric scores and rubric totals", () => {
    const s = session();
    s.attempts = [{ ...grade(activities[0], "a trip"), score: 88 }];
    expect(() =>
      decodeState(JSON.stringify({ ...emptyState(), current: s })),
    ).toThrow();
  });
  it("validates settings ranges and strips unexpected fields", () => {
    expect(validateSettings({ ...defaults, answer: "PRIVATE TEXT" })).toEqual(
      defaults,
    );
    expect(() => validateSettings({ ...defaults, sfxVolume: 101 })).toThrow();
    expect(() =>
      validateSettings({ ...defaults, assessmentDays: 0 }),
    ).toThrow();
  });
});
describe("assessments, rewards and hints", () => {
  it("does not award XP for a session consisting entirely of skips", () => {
    const s = finished("all-skips", "2026-11-01T12:00:00");
    s.attempts = activities.map((a) => unscored(a, "skipped"));
    expect(rewards([s]).xp).toBe(0);
  });
  it("offers a check after five lessons or seven calendar days", () => {
    const h = Array.from({ length: 5 }, (_, i) =>
      finished(`f${i}`, "2026-11-01T12:00:00"),
    );
    expect(assessmentDue(h, 7, 5, new Date("2026-11-02T12:00:00"))).toBe(true);
    expect(
      assessmentDue(h.slice(0, 1), 7, 5, new Date("2026-11-08T00:00:00")),
    ).toBe(true);
    expect(
      assessmentDue(h.slice(0, 1), 7, 5, new Date("2026-11-07T23:59:00")),
    ).toBe(false);
  });
  it("resets cadence after an assessment and compares transparent denominators", () => {
    const a = finished("a", "2026-11-01T12:00:00", "assessment"),
      b = finished("b", "2026-11-02T12:00:00", "assessment");
    a.attempts = [grade(assessmentActivities()[0], "a suitcase")];
    b.attempts = [grade(assessmentActivities()[0], "train station")];
    expect(assessmentDue([a, b], 7, 5, new Date("2026-11-03T12:00:00"))).toBe(
      false,
    );
    expect(trend([a, b])).toContain("Higher observed performance");
    expect(trend([a, b])).toContain("1/5 assessed");
  });
  it("uses original rotating forms covering five skills", () => {
    expect(
      new Set([0, 1, 2, 3].map((v) => assessmentActivities(v)[1].text)).size,
    ).toBe(4);
    expect(new Set(assessmentActivities(1).map((a) => a.skill)).size).toBe(5);
    expect(assessmentActivities(4)).toEqual(assessmentActivities(0));
  });
  it("gives no extra first-answer credit or XP for retries", () => {
    const s = finished("x", "2026-11-01T12:00:00");
    s.attempts = [grade(activities[0], "a suitcase")];
    const before = rewards([s]);
    s.attempts.push(grade(activities[0], "a trip"));
    expect(rewards([s]).xp).toBe(before.xp);
    expect(rewards([s]).badges).toEqual([]);
  });
  it("counts local-date streaks without duplicate days", () => {
    expect(
      streak(
        [
          finished("a", "2026-11-05T12:00:00"),
          finished("b", "2026-11-06T12:00:00"),
          finished("c", "2026-11-06T15:00:00"),
        ],
        new Date("2026-11-07T15:00:00"),
      ),
    ).toBe(2);
  });
  it("helps with one contextual word, not a paragraph or tested answer", () => {
    expect(localWordHelp.lookup("fährt", activities[1])).toMatchObject({
      meaning: "travels / goes by vehicle",
    });
    expect(
      typeof localWordHelp.lookup(activities[1].text!, activities[1]),
    ).toBe("string");
    expect(localWordHelp.lookup("Bonn", activities[1])).toContain("gives away");
    expect(localWordHelp.lookup("mit", activities[2])).toMatchObject({
      meaning: "with",
    });
  });
});
describe("local speech and sound privacy", () => {
  it("does not create an audio context for muted or disabled effects", async () => {
    const create = vi.fn();
    vi.stubGlobal("AudioContext", create);
    const player = new SoundPlayer();
    expect(
      await player.play("success", { ...defaults, sfx: true, muted: true }),
    ).toBe(false);
    expect(
      await player.play("badge", { ...defaults, sfx: false, muted: false }),
    ).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
  it("finds all German locales but refuses remote speech without consent", () => {
    const voices = [
      { voiceURI: "de-local", lang: "de-DE", localService: true },
      { voiceURI: "at-remote", lang: "de-AT", localService: false },
      { voiceURI: "ch-local", lang: "de-CH", localService: true },
      { voiceURI: "en", lang: "en-US", localService: true },
    ];
    const speak = vi.fn();
    vi.stubGlobal("speechSynthesis", {
      getVoices: () => voices,
      speak,
      cancel: vi.fn(),
    });
    vi.stubGlobal("SpeechSynthesisUtterance", class {});
    expect(browserSpeechProvider.voices()).toHaveLength(3);
    expect(browserSpeechProvider.speak("Hallo", "at-remote")).toBe(false);
    expect(speak).not.toHaveBeenCalled();
    expect(browserSpeechProvider.speak("Hallo", "de-local")).toBe(true);
  });
});
