import { describe, expect, it } from "vitest";
import {
  activities,
  grade,
  remediation,
  report,
  score,
  streak,
  type Session,
} from "./domain";
import { parseState, mockTranscriptionProvider } from "./providers";
const session = (): Session => ({
  id: "fictional-test",
  index: 0,
  attempts: [],
  elapsedMs: 0,
});
describe("deterministic grading", () => {
  it("accepts original model answers and common equivalent forms", () => {
    for (const a of activities) expect(grade(a, a.model).score).toBe(100);
    expect(
      grade(activities[2], "Ich gehe mit meiner Freundin in den Park.").score,
    ).toBe(100);
    expect(grade(activities[1], "Bonn").score).toBe(100);
  });
  it("distinguishes minor capitalization from known major grammar errors", () => {
    expect(
      grade(activities[2], "Ich gehe mit der Freundin in den Park.").kind,
    ).toBe("unrecognized");
    expect(
      grade(activities[2], "ich gehe mit meinem freund in den park").kind,
    ).toBe("minor");
    expect(
      grade(activities[2], "Ich gehe mit meinen Freund in den Park.").kind,
    ).toBe("major");
    expect(grade(activities[5], "Am Sonntag lese ich.").kind).toBe(
      "unrecognized",
    );
  });
  it("does not inflate scores through retries or treat missing attempts as assessed", () => {
    const s = session();
    expect(score(s)).toBeNull();
    s.attempts = [
      grade(activities[0], "a suitcase"),
      grade(activities[0], "a trip"),
      grade(activities[1], "Nach Bonn."),
    ];
    expect(score(s)).toBe(50);
    expect(score(s, "vocabulary")).toBe(0);
    expect(score(s, "writing")).toBeNull();
  });
  it("includes skips as zero and averages both speaking activities", () => {
    const s = session();
    s.attempts = [
      grade(activities[4], activities[4].model),
      { activityId: "s2", score: 0, kind: "skipped" },
    ];
    expect(score(s, "speaking")).toBe(50);
  });
  it("provides a different explanation after repeated errors in the same activity", () => {
    const a = activities[2];
    const wrong = grade(a, "mit meinen Freund");
    expect(remediation(a, [wrong])).toContain(a.rule);
    expect(remediation(a, [wrong, wrong])).toContain(a.alternative);
  });
});
describe("reports and persistence", () => {
  it("builds factual preview strengths, corrections, and goals from attempts", () => {
    const s = session();
    s.attempts = [
      grade(activities[0], "a trip"),
      grade(activities[2], "mit meinen Freund"),
    ];
    const r = report(s);
    expect(r.status).toBe("PREVIEW — NOT SENT");
    expect(r.strengths).toEqual([activities[0].title]);
    expect(r.mistakes[0].model).toBe(activities[2].model);
    expect(r.goals).toContain(activities[2].rule);
    expect(r.scores.find((x) => x.skill === "reading")?.score).toBeNull();
  });
  it("rejects corrupt, invalid, or incompatible saved state", () => {
    for (const value of [
      "oops",
      "null",
      "{}",
      JSON.stringify({
        version: 1,
        current: { ...session(), index: 80 },
        history: [],
      }),
      JSON.stringify({
        version: 1,
        current: {
          ...session(),
          attempts: [{ activityId: "v1", score: 999, kind: "correct" }],
        },
        history: [],
      }),
    ])
      expect(parseState(value).current).toBeNull();
  });
  it("round-trips completed outcomes without keeping raw free text", () => {
    const s = session();
    s.attempts = [grade(activities[2], "fictional unknown answer")];
    const raw = JSON.stringify({ version: 1, current: s, history: [] });
    expect(parseState(raw).current).toEqual(s);
    expect(raw).not.toContain("fictional unknown answer");
  });
  it("counts consecutive local days once and tolerates an unfinished today", () => {
    const history = [
      "2026-11-06T12:00:00",
      "2026-11-06T14:00:00",
      "2026-11-05T12:00:00",
    ].map((completedAt) => ({ ...session(), completedAt }));
    expect(streak(history, new Date("2026-11-07T15:00:00"))).toBe(2);
    expect(streak(history, new Date("2026-11-08T15:00:00"))).toBe(0);
  });
  it("returns only the supplied manual transcript, never simulated audio recognition", async () => {
    const t = await mockTranscriptionProvider.transcribe(
      new Blob(["fictional"]),
      "Ich besuche meine Familie.",
    );
    expect(t.source).toBe("manual");
    expect(t.text).toBe("Ich besuche meine Familie.");
  });
});
