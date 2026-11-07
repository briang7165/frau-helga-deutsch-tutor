export const skills = [
  "vocabulary",
  "reading",
  "writing",
  "listening",
  "speaking",
] as const;
export type Skill = (typeof skills)[number];
export type Activity = {
  id: string;
  skill: Skill;
  title: string;
  prompt: string;
  text?: string;
  choices?: string[];
  accepted: string[];
  model: string;
  rule: string;
  alternative: string;
  minutes: number;
};
export const activities: Activity[] = [
  {
    id: "v1",
    skill: "vocabulary",
    title: "Ein kleiner Ausflug",
    prompt: "Was bedeutet „der Ausflug“?",
    choices: ["a trip", "a suitcase", "a restaurant"],
    accepted: ["a trip"],
    model: "a trip",
    rule: "Ein Ausflug is a short trip: Wir machen einen Ausflug.",
    alternative:
      "Think of leaving home for an afternoon: ein Ausflug, not a suitcase (der Koffer).",
    minutes: 4,
  },
  {
    id: "r1",
    skill: "reading",
    title: "Samstag am Fluss",
    text: "Am Samstag fährt Nora mit dem Zug nach Bonn. Sie besucht ihren Bruder. Am Nachmittag gehen sie am Rhein spazieren.",
    prompt: "Wohin fährt Nora am Samstag?",
    accepted: [
      "nach Bonn",
      "Bonn",
      "Sie fährt nach Bonn",
      "Nora fährt nach Bonn",
    ],
    model: "Nach Bonn.",
    rule: "Look for the destination after nach: nach Bonn.",
    alternative:
      "Wer? Nora. Wann? Am Samstag. Wohin? Nach Bonn. Each question asks for a different detail.",
    minutes: 5,
  },
  {
    id: "w1",
    skill: "writing",
    title: "Mit wem gehen Sie?",
    prompt:
      "Write in German: I am going to the park with my friend. Use „Ich gehe …“.",
    accepted: [
      "Ich gehe mit meinem Freund in den Park",
      "Ich gehe mit meiner Freundin in den Park",
      "Ich gehe in den Park mit meinem Freund",
      "Ich gehe in den Park mit meiner Freundin",
    ],
    model: "Ich gehe mit meinem Freund in den Park.",
    rule: "Nach mit steht der Dativ: mit meinem Freund / mit meiner Freundin. A destination uses in den Park.",
    alternative:
      "Two separate questions: Mit wem? → mit meinem Freund (dative). Wohin? → in den Park (accusative). Der Artikel braucht einen Arbeitsplatz.",
    minutes: 7,
  },
  {
    id: "l1",
    skill: "listening",
    title: "Auf dem Wochenmarkt",
    text: "Am Freitag kaufe ich frisches Brot und zwei Äpfel.",
    prompt:
      "What does Frau Helga buy besides two apples? Answer in English or German.",
    accepted: ["fresh bread", "bread", "frisches Brot", "Brot"],
    model: "Frisches Brot.",
    rule: "Listen for frisches Brot: fresh bread. The apples are the other purchase.",
    alternative:
      "Split the sentence at und: frisches Brot | zwei Äpfel. We want the first item.",
    minutes: 5,
  },
  {
    id: "s1",
    skill: "speaking",
    title: "Deutlich, bitte",
    text: "Ich fahre am Samstag mit dem Zug.",
    prompt:
      "Say the sentence, then type its transcript. M1 checks the text only.",
    accepted: ["Ich fahre am Samstag mit dem Zug"],
    model: "Ich fahre am Samstag mit dem Zug.",
    rule: "The verb fahre is second. Mit dem Zug uses the dative.",
    alternative:
      "Build it in pieces: Ich fahre | am Samstag | mit dem Zug. Read slowly, then connect the pieces.",
    minutes: 4,
  },
  {
    id: "s2",
    skill: "speaking",
    title: "Ein Gespräch mit Frau Helga",
    text: "Und Sie? Was machen Sie am Wochenende?",
    prompt:
      "Choose a reply or type one of your own. This scripted demo recognizes the two model replies below.",
    choices: ["Ich besuche meine Familie.", "Ich mache einen Ausflug."],
    accepted: ["Ich besuche meine Familie", "Ich mache einen Ausflug"],
    model: "Ich besuche meine Familie.",
    rule: "Use a subject + conjugated verb + object: Ich besuche meine Familie.",
    alternative:
      "Start with Ich. Add besuche (I visit), then meine Familie. A complete sentence, bitte.",
    minutes: 5,
  },
];
export type ResultKind =
  "correct" | "minor" | "major" | "unrecognized" | "skipped";
export type Attempt = { activityId: string; score: number; kind: ResultKind };
export type Session = {
  id: string;
  index: number;
  attempts: Attempt[];
  elapsedMs: number;
  completedAt?: string;
};
export type State = { version: 1; current: Session | null; history: Session[] };
export const emptyState = (): State => ({
  version: 1,
  current: null,
  history: [],
});
const normalize = (s: string) =>
  s
    .trim()
    .replace(/[.!?]+$/u, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("de");
export function grade(a: Activity, answer: string): Attempt {
  const clean = answer
    .trim()
    .replace(/[.!?]+$/u, "")
    .replace(/\s+/g, " ");
  if (a.accepted.some((v) => normalize(v) === normalize(answer))) {
    const correctCase = a.accepted.some(
      (v) =>
        v === clean ||
        v.charAt(0).toLocaleUpperCase("de") + v.slice(1) === clean,
    );
    const minor = !correctCase && /[A-ZÄÖÜ]/u.test(a.accepted[0]);
    return {
      activityId: a.id,
      score: minor ? 90 : 100,
      kind: minor ? "minor" : "correct",
    };
  }
  // A bounded rubric: unknown free text is never represented as a comprehensive AI judgment.
  const knownGrammarError =
    /\bmit (mein|meinen) Freund\b|\bmit (meine|meinen) Freundin\b|\bich (gehen|besuchen|fahren)\b|\bin der Park\b/iu.test(
      answer,
    );
  return {
    activityId: a.id,
    score: 0,
    kind:
      (a.choices && a.skill === "vocabulary") || knownGrammarError
        ? "major"
        : "unrecognized",
  };
}
export function remediation(a: Activity, attempts: Attempt[]): string {
  const errors = attempts.filter(
    (x) =>
      x.activityId === a.id &&
      (x.kind === "major" || x.kind === "unrecognized"),
  ).length;
  return errors >= 2
    ? `Kein Unglück. Wir probieren es anders. ${a.alternative}`
    : `Schritt für Schritt. ${a.rule}`;
}
export function score(session: Session, skill?: Skill): number | null {
  const relevant = activities.filter((a) => !skill || a.skill === skill);
  const first = relevant
    .map((a) => session.attempts.find((t) => t.activityId === a.id))
    .filter((t): t is Attempt => !!t);
  return first.length
    ? Math.round(first.reduce((sum, t) => sum + t.score, 0) / first.length)
    : null;
}
export function report(session: Session) {
  const strengths = activities.filter(
    (a) =>
      (session.attempts.find((t) => t.activityId === a.id)?.score ?? 0) >= 90,
  );
  const mistakes = activities.filter((a) =>
    session.attempts.some((t) => t.activityId === a.id && t.kind !== "correct"),
  );
  return {
    status: "PREVIEW — NOT SENT" as const,
    lead: "Frau Helgas Tagesbericht: Heute haben wir einen Ausflug geplant. Hier zählt die geleistete Arbeit.",
    scores: skills.map((skill) => ({ skill, score: score(session, skill) })),
    strengths: strengths.map((a) => a.title),
    mistakes: mistakes.map((a) => ({
      title: a.title,
      rule: a.rule,
      model: a.model,
      skipped:
        session.attempts.find((t) => t.activityId === a.id)?.kind === "skipped",
    })),
    goals: (mistakes.length ? mistakes : [activities[2], activities[5]])
      .slice(0, 2)
      .map((a) => a.rule),
  };
}
export function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function streak(history: Session[], now = new Date()): number {
  const days = new Set(
    history
      .filter((s) => s.completedAt)
      .map((s) => localDay(new Date(s.completedAt!))),
  );
  const cursor = new Date(now);
  let count = 0;
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(localDay(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
export const clock = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
