import { describe, expect, it } from "vitest";
import {
  activities,
  grade,
  teachingFeedback,
  unscored,
  score,
  type Session,
} from "./engine";
import { decodeState } from "./persistence";
import { defaults, validateSettings } from "./preferences";
const reading = activities[1];
export const example =
  "On Saturday Nora goes by train to Bonn. She visits her brother. At night she goes to the Rhein Space.";
describe("bounded destination intent", () => {
  it.each([
    "Bonn",
    "Nach Bonn.",
    "nach Bonn!",
    "Sie fährt nach Bonn",
    "Nora fährt am Samstag nach Bonn",
  ])("accepts German destination %s", (answer) =>
    expect(grade(reading, answer).score).toBe(100),
  );
  it.each(["to Bonn", "Nora goes to Bonn", "Nora travels to Bonn"])(
    "awards 75 for short English %s",
    (answer) => expect(grade(reading, answer).score).toBe(75),
  );
  it("explains the exact reported translation without rewarding unrelated detail", () => {
    const result = grade(reading, example);
    expect(result.score).toBe(60);
    expect(result.rubric_parts.map((p) => p.awarded)).toEqual([60, 0, 0]);
    const feedback = teachingFeedback(reading, result);
    expect(feedback.right).toContain("Train is also correct");
    expect(feedback.right).toContain("Brother is also correct");
    expect(feedback.correction).toContain("afternoon, not at night");
    expect(feedback.correction).toContain("walk by the Rhine");
    expect(feedback.next).toContain("Nach Bonn.");
  });
  it.each([
    "not Bonn",
    "Nora does NOT go to Bonn",
    "Sie fährt nicht nach Bonn",
    "Berlin",
    "Nach Berlin",
    "to Berlin",
  ])("never awards destination credit for %s", (answer) => {
    const result = grade(reading, answer);
    expect(result.score).toBeLessThanOrEqual(40);
    expect(result.rubric_parts[0].awarded).toBe(0);
  });
  it.each([
    "I mention Bonn but Nora goes elsewhere",
    "Nora goes to Bonn. Actually she does not.",
    "Nora goes to Bonn or Berlin",
    "On Saturday Nora goes by train to Bonn. She does not visit her brother.",
    "In dieser Stadt besucht sie ihren Bruder",
  ])("keeps uncertain wording unscored: %s", (answer) =>
    expect(grade(reading, answer).status).toBe("needs_review"),
  );
  it("keeps first scores and structured outcomes through storage validation", () => {
    const current: Session = {
      id: "qc",
      index: 1,
      elapsedMs: 0,
      attempts: [grade(reading, example), grade(reading, "Nach Bonn")],
    };
    const raw = JSON.stringify({ version: 2, current, history: [] });
    expect(raw).not.toContain(example);
    expect(score(decodeState(raw).current!, "reading")).toBe(60);
    expect(unscored(reading, "skipped").score).toBeNull();
  });
  it("keeps an uncertain Bonn mention unscored with actionable feedback", () => {
    const result = grade(
      reading,
      "Bonn might be where she goes, but I am unsure",
    );
    expect(result.score).toBeNull();
    expect(teachingFeedback(reading, result).right).toContain("mention Bonn");
    expect(teachingFeedback(reading, result).next).toContain("Nach Bonn.");
  });
  it("recognizes a bounded accurate translation without treating it as the requested task", () => {
    const result = grade(
      reading,
      "On Saturday Nora travels by train to Bonn. She visits her brother. In the afternoon they go for a walk by the Rhine.",
    );
    expect(result.score).toBe(60);
    expect(result.error_tags).not.toContain("time_meaning");
    expect(result.error_tags).not.toContain("walk_meaning");
  });
  it("migrates layout preferences without losing old settings", () => {
    expect(validateSettings({ version: 1, sfxVolume: 35 })).toMatchObject({
      compact: true,
      sidebarCollapsed: true,
      sfxVolume: 35,
    });
    expect(
      validateSettings({
        ...defaults,
        compact: false,
        sidebarCollapsed: false,
      }),
    ).toMatchObject({ compact: false, sidebarCollapsed: false });
  });
});
