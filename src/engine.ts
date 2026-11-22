import { activities, skills, type Activity, type Skill } from "./content";
export { activities, skills, type Activity, type Skill } from "./content";
export type Status =
  "correct" | "partial" | "incorrect" | "needs_review" | "skipped";
export type Criterion =
  | "meaning"
  | "verb"
  | "order"
  | "form"
  | "legacy"
  | "destination"
  | "language"
  | "task";
export const messages: Record<Criterion, string> = {
  destination: "Identify Nora's destination (60 points).",
  language:
    "Answer in German; the place name alone is language-neutral (25 points).",
  task: "Give a short destination answer rather than translate the passage (15 points).",
  meaning: "Communicate the requested meaning.",
  verb: "Use the correct core verb and tense.",
  order: "Place the conjugated verb second in a statement.",
  form: "Check case, articles, spelling and capitals.",
  legacy:
    "Historical M1 result; original response was not retained, so it cannot be regraded.",
};
export type RubricPart = {
  criterion: Criterion;
  awarded: number;
  possible: number;
  message: string;
};
export type Attempt = {
  activityId: string;
  score: number | null;
  status: Status;
  rubric_parts: RubricPart[];
  error_tags: string[];
  assisted: boolean;
  confidence: "high" | "limited";
  legacyScore?: number;
};
export type Session = {
  id: string;
  index: number;
  attempts: Attempt[];
  elapsedMs: number;
  completedAt?: string;
  mode?: "practice" | "assessment";
  variant?: number;
  targetMinutes?: number;
};
export type State = { version: 2; current: Session | null; history: Session[] };
export const emptyState = (): State => ({
  version: 2,
  current: null,
  history: [],
});
export const normalize = (s: string) =>
  s
    .trim()
    .replace(/[.!?]+$/u, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("de");
const clean = (s: string) =>
  s
    .trim()
    .replace(/[.!?]+$/u, "")
    .replace(/\s+/g, " ");
const part = (
  criterion: Criterion,
  awarded: number,
  possible: number,
): RubricPart => ({
  criterion,
  awarded,
  possible,
  message: messages[criterion],
});
function result(
  a: Activity,
  parts: RubricPart[],
  tags: string[] = [],
  assisted = false,
): Attempt {
  const score = parts.reduce((n, p) => n + p.awarded, 0);
  return {
    activityId: a.id,
    score,
    status: score === 100 ? "correct" : score === 0 ? "incorrect" : "partial",
    rubric_parts: parts,
    error_tags: tags,
    assisted,
    confidence: "high",
  };
}
export function unscored(
  a: Activity,
  status: "needs_review" | "skipped",
  assisted = false,
): Attempt {
  return {
    activityId: a.id,
    score: null,
    status,
    rubric_parts: [],
    error_tags: [],
    assisted,
    confidence: "limited",
  };
}
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = old;
    }
  }
  return row[b.length];
}
export function grade(a: Activity, answer: string, assisted = false): Attempt {
  const n = normalize(answer);
  const c = clean(answer);
  if (a.id === "r1") return gradeDestination(a, n, assisted);
  if (a.skill === "writing" && /\b(freun|fruend|parkk)\b/iu.test(c)) {
    const corrected = c
      .replace(/\bfreun\b/giu, "Freund")
      .replace(/\bfruend\b/giu, "Freund")
      .replace(/\bparkk\b/giu, "Park");
    const base = grade(a, corrected, assisted);
    if (base.score !== null) {
      const parts = base.rubric_parts.map((p) =>
        p.criterion === "form"
          ? { ...p, awarded: Math.max(0, p.awarded - 3) }
          : p,
      );
      return result(a, parts, [...base.error_tags, "spelling"], assisted);
    }
  }
  const aliases =
    a.id === "v1"
      ? ["an outing", "a short trip", "an excursion"]
      : a.id === "s2"
        ? [
            "Am Wochenende besuche ich meine Familie",
            "Ich besuche am Wochenende meine Familie",
            "Am Sonntag lese ich ein Buch",
            "Ich lese ein Buch",
            "Ich schlafe",
            "Ich gehe spazieren",
          ]
        : [];
  const accepted = [...a.accepted, ...aliases];
  if (accepted.some((v) => normalize(v) === n)) {
    const caseOK = accepted.some(
      (v) =>
        clean(v) === c ||
        clean(v)[0].toLocaleUpperCase("de") + clean(v).slice(1) === c,
    );
    const minor =
      !caseOK &&
      a.skill !== "vocabulary" &&
      /[A-ZÄÖÜ]/u.test(accepted.find((v) => normalize(v) === n) ?? "");
    return a.skill === "writing"
      ? result(
          a,
          [
            part("meaning", 40, 40),
            part("verb", 25, 25),
            part("order", 20, 20),
            part("form", minor ? 12 : 15, 15),
          ],
          minor ? ["capitalization"] : [],
          assisted,
        )
      : result(
          a,
          [part("meaning", 90, 90), part("form", minor ? 7 : 10, 10)],
          minor ? ["capitalization"] : [],
          assisted,
        );
  }
  if (a.skill === "writing") {
    const destination =
      a.model.match(/in den (\w+)/)?.[1].toLowerCase() ?? "park";
    // Whole-sentence templates, not a bag of keywords. Unknown clauses stay unscored.
    const match = n.match(
      /^ich (gehe|gehen|gehst) (?:mit (mein(?:em|en|er|e)? )?(freund|freundin) in (?:den |dem |der )?(park|garten|zoo|wald|hof)|in (?:den |dem |der )?(park|garten|zoo|wald|hof) mit (mein(?:em|en|er|e)? )?(freund|freundin))$/,
    );
    if (match) {
      const place = match[4] ?? match[5];
      if (place !== destination)
        return result(
          a,
          [
            part("meaning", 0, 40),
            part("verb", match[1] === "gehe" ? 25 : 10, 25),
            part("order", 20, 20),
            part("form", 0, 15),
          ],
          ["meaning"],
          assisted,
        );
      const correctArticles =
        (n.includes("mit meinem freund ") ||
          n.endsWith("mit meinem freund") ||
          n.includes("mit meiner freundin ") ||
          n.endsWith("mit meiner freundin")) &&
        n.includes(`in den ${destination}`);
      const capitals =
        /\bIch\b/.test(c) &&
        new RegExp(
          `\\b${destination[0].toUpperCase() + destination.slice(1)}\\b`,
        ).test(c) &&
        /\bFreund(in)?\b/.test(c);
      return result(
        a,
        [
          part("meaning", 40, 40),
          part("verb", match[1] === "gehe" ? 25 : 10, 25),
          part("order", 20, 20),
          part("form", correctArticles ? (capitals ? 15 : 12) : 5, 15),
        ],
        [
          ...(correctArticles ? [] : ["case_articles"]),
          ...(capitals ? [] : ["capitalization"]),
          ...(match[1] === "gehe" ? [] : ["verb"]),
        ],
        assisted,
      );
    }
    if (n === `ich mit meinem freund gehe in den ${destination}`)
      return result(
        a,
        [
          part("meaning", 40, 40),
          part("verb", 25, 25),
          part("order", 5, 20),
          part("form", 12, 15),
        ],
        ["word_order"],
        assisted,
      );
  }
  const wrongChoices =
    a.skill === "vocabulary" && a.choices?.some((v) => normalize(v) === n);
  const incompatible =
    /^(?:ich schlafe|i sleep|keine ahnung|i don'?t know|weiß nicht|weiss nicht|pizza|a suitcase|a restaurant|water|wasser|berlin|nach berlin)$/u.test(
      n,
    );
  if (
    wrongChoices ||
    incompatible ||
    accepted.some((v) => n === `nicht ${normalize(v)}`)
  )
    return result(a, [part("meaning", 0, 100)], ["meaning"], assisted);
  if (
    a.skill !== "writing" &&
    n.length >= 4 &&
    accepted.some((v) => distance(normalize(v), n) === 1)
  )
    return result(
      a,
      [part("meaning", 90, 90), part("form", 5, 10)],
      ["spelling"],
      assisted,
    );
  return unscored(a, "needs_review", assisted);
}
function gradeDestination(a: Activity, n: string, assisted: boolean): Attempt {
  const rubric = a.rubric!;
  const scored = (
    meaning: boolean,
    german: boolean,
    short: boolean,
    tags: string[] = [],
  ) =>
    result(
      a,
      [
        part(
          "destination",
          meaning ? rubric.destination : 0,
          rubric.destination,
        ),
        part("language", german ? rubric.language : 0, rubric.language),
        part("task", short ? rubric.task : 0, rubric.task),
      ],
      tags,
      assisted,
    );
  if (
    /^(?:nach )?bonn$|^(?:sie|nora) fährt (?:am samstag )?nach bonn$/u.test(n)
  )
    return scored(true, true, true);
  if (n === "nach bon")
    return result(
      a,
      [
        part("destination", 60, 60),
        part("language", 20, 25),
        part("task", 15, 15),
      ],
      ["spelling"],
      assisted,
    );
  // Match complete bounded clauses. Mentioning Bonn alone inside an unknown
  // sentence is never evidence of a positive destination assertion.
  if (/^(?:to bonn|(?:nora|she) (?:goes|travels) to bonn)$/u.test(n))
    return scored(true, false, true, ["response_language"]);
  if (
    /^(?:(?:nicht|not) (?:nach |to )?bonn|(?:nora|she) does not (?:go|travel) to bonn|(?:nora|sie) fährt nicht nach bonn)$/u.test(
      n,
    )
  )
    return scored(false, /^(nicht|nora fährt|sie fährt)/u.test(n), true, [
      "meaning",
    ]);
  if (
    /^(?:nach |to )?(?:berlin|köln|cologne|trier|hamburg)$|^(?:nora|sie) fährt nach (?:berlin|köln|trier|hamburg)$/u.test(
      n,
    )
  )
    return scored(false, !/^(to |cologne)/u.test(n), true, ["meaning"]);
  const clauses = n.split(/\.\s*/u);
  if (
    /^(?:on saturday )?(?:nora|she) (?:goes|travels) (?:by train )?to bonn$/u.test(
      clauses[0],
    ) &&
    clauses.length > 1 &&
    clauses
      .slice(1)
      .every((clause) =>
        /^(?:she visits her brother|(?:in the afternoon|at night) (?:she goes to the rhein space|they go for a walk by the rhine))$/u.test(
          clause,
        ),
      )
  ) {
    return scored(true, false, false, [
      "response_language",
      "task_mismatch",
      ...(clauses[0].includes("by train") ? ["fact_train"] : []),
      ...(clauses.includes("she visits her brother") ? ["fact_brother"] : []),
      ...(clauses.some((c) => c.startsWith("at night"))
        ? ["time_meaning"]
        : []),
      ...(clauses.some((c) => c.endsWith("rhein space"))
        ? ["walk_meaning"]
        : []),
    ]);
  }
  const unknown = unscored(a, "needs_review", assisted);
  if (/\bbonn\b/u.test(n)) unknown.error_tags = ["destination_mention"];
  return unknown;
}
export function teachingFeedback(
  a: Activity,
  attempt: Attempt,
  attempts: Attempt[] = [attempt],
) {
  const tags = attempt.error_tags;
  const destination = attempt.rubric_parts.find(
    (p) => p.criterion === "destination",
  );
  const right =
    attempt.status === "needs_review"
      ? `${tags.includes("destination_mention") ? "I can see that you mention Bonn, but " : ""}I cannot confidently grade the entire sentence offline; this attempt is unscored.`
      : a.id === "r1"
        ? `${destination?.awarded ? "You identified Bonn as the destination." : "The destination is not correct."}${tags.includes("fact_train") ? " Train is also correct." : ""}${tags.includes("fact_brother") ? " Brother is also correct." : ""}`
        : attempt.status === "correct"
          ? "Sehr gut. You communicated the requested meaning."
          : attempt.score
            ? `Credit earned: ${attempt.rubric_parts
                .filter((p) => p.awarded > 0)
                .map((p) => `${p.criterion} ${p.awarded}/${p.possible}`)
                .join("; ")}.`
            : "This answer does not demonstrate the requested meaning yet.";
  const correction =
    [
      tags.includes("response_language") ? "Answer in German." : "",
      tags.includes("task_mismatch")
        ? "Give the destination, not a paragraph translation; extra facts earn no task points."
        : "",
      tags.includes("time_meaning")
        ? "Am Nachmittag means afternoon, not at night."
        : "",
      tags.includes("walk_meaning")
        ? "Gehen sie am Rhein spazieren means they go for a walk by the Rhine, not ‘Rhein Space’."
        : "",
    ]
      .filter(Boolean)
      .join(" ") ||
    (attempt.status === "correct"
      ? "Keep this pattern."
      : remediation(a, attempts));
  return {
    right,
    correction,
    next: `Model: ${a.model} Continue, or try again for practice. Your first attempt stays fixed.`,
  };
}
export function remediation(a: Activity, attempts: Attempt[]): string {
  const errors = attempts.filter(
    (t) =>
      t.activityId === a.id &&
      (t.status === "partial" || t.status === "incorrect"),
  ).length;
  return errors >= 2
    ? `Kein Unglück. Let's try a different explanation. ${a.alternative}`
    : `Schritt für Schritt. ${a.rule}`;
}
export function assessmentActivities(variant = 0): Activity[] {
  const v = variant % 4;
  const towns = ["Köln", "Trier", "Leipzig", "Dresden"];
  const people = ["Mira", "Paul", "Ada", "Emil"];
  const vocab = [
    ["der Bahnhof", "train station"],
    ["die Fahrkarte", "ticket"],
    ["der Regenschirm", "umbrella"],
    ["die Bäckerei", "bakery"],
  ][v];
  const foods = [
    ["Käse", "cheese"],
    ["Milch", "milk"],
    ["Tomaten", "tomatoes"],
    ["Kartoffeln", "potatoes"],
  ][v];
  const place = ["Garten", "Zoo", "Wald", "Hof"][v];
  const town = towns[v];
  const prefix = `a${v}-`;
  return [
    {
      ...activities[0],
      id: prefix + "v",
      title: "At the station and in town",
      prompt: `What does „${vocab[0]}“ mean?`,
      choices: [vocab[1], "a suitcase", "a restaurant"],
      accepted: [vocab[1]],
      model: vocab[1],
      rule: `Review the meaning of ${vocab[0]}.`,
    },
    {
      ...activities[1],
      id: prefix + "r",
      rubric: undefined,
      referenceFacts: [town, "Monday", "friend"],
      title: "A new journey",
      text: `${people[v]} fährt am Montag nach ${town}. Dort wartet eine Freundin.`,
      prompt: `Wohin fährt ${people[v]}?`,
      accepted: [town, `Nach ${town}`, `${people[v]} fährt nach ${town}`],
      model: `Nach ${town}.`,
      rule: "Find the destination after nach.",
    },
    {
      ...activities[2],
      id: prefix + "w",
      title: "Plan a walk",
      prompt: `Translate into German: I am going to the ${["garden", "zoo", "forest", "courtyard"][v]} with my friend.`,
      accepted: [
        `Ich gehe mit meinem Freund in den ${place}`,
        `Ich gehe mit meiner Freundin in den ${place}`,
        `Ich gehe in den ${place} mit meinem Freund`,
      ],
      model: `Ich gehe mit meinem Freund in den ${place}.`,
      rule: `After mit use dative: meinem Freund / meiner Freundin. For this destination use in den ${place}.`,
      alternative: `Separate companion (mit wem?) from destination (wohin?). Use mit meinem Freund and in den ${place}.`,
    },
    {
      ...activities[3],
      id: prefix + "l",
      title: "A different shopping list",
      text: `Heute kaufe ich ${foods[0]} und eine Zeitung.`,
      prompt: "What food does Frau Helga buy? Answer in English or German.",
      accepted: foods,
      model: foods[0],
      rule: "Separate the food from the newspaper (eine Zeitung).",
    },
    {
      ...activities[4],
      id: prefix + "s",
      title: "Your next journey",
      text: `Ich fahre morgen nach ${town}.`,
      prompt: "Say the sentence, then type what you said in German.",
      accepted: [`Ich fahre morgen nach ${town}`],
      model: `Ich fahre morgen nach ${town}.`,
      rule: "Keep the verb second: subject, verb, time, destination.",
    },
  ];
}
export const sessionActivities = (s: Session) =>
  s.mode === "assessment" ? assessmentActivities(s.variant) : activities;
export function breakdown(s: Session, skill?: Skill) {
  const list = sessionActivities(s).filter((a) => !skill || a.skill === skill);
  const first = list.map((a) => s.attempts.find((t) => t.activityId === a.id));
  const assessed = first.filter((t): t is Attempt => !!t && t.score !== null);
  return {
    score: assessed.length
      ? Math.round(assessed.reduce((n, t) => n + t.score!, 0) / assessed.length)
      : null,
    assessed: assessed.length,
    total: list.length,
    needsReview: first.filter((t) => t?.status === "needs_review").length,
    skipped: first.filter((t) => t?.status === "skipped").length,
    missing: first.filter((t) => !t).length,
    assisted: first.filter((t) => t?.assisted).length,
  };
}
export const score = (s: Session, skill?: Skill) => breakdown(s, skill).score;
export function report(s: Session) {
  const list = sessionActivities(s);
  const first = (a: Activity) => s.attempts.find((t) => t.activityId === a.id);
  const needs = list.filter((a) => first(a)?.status !== "correct");
  return {
    status: "PREVIEW — NOT SENT" as const,
    lead: "Frau Helgas Tagesbericht: We count what you demonstrated, and keep uncertainty visible.",
    scores: skills.map((skill) => ({ skill, ...breakdown(s, skill) })),
    strengths: list
      .filter((a) => (first(a)?.score ?? 0) >= 90)
      .map((a) => a.title),
    mistakes: needs.map((a) => ({
      title: a.title,
      rule: a.rule,
      model: a.model,
      status: first(a)?.status ?? "missing",
    })),
    goals: (needs.length ? needs : list.slice(-2))
      .slice(0, 2)
      .map((a) => a.rule),
    ...breakdown(s),
  };
}
export function localDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function streak(history: Session[], now = new Date()) {
  const days = new Set(
    history
      .filter((s) => s.completedAt)
      .map((s) => localDay(new Date(s.completedAt!))),
  );
  const d = new Date(now);
  let n = 0;
  if (!days.has(localDay(d))) d.setDate(d.getDate() - 1);
  while (days.has(localDay(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
export const clock = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
export function assessmentDue(
  history: Session[],
  days = 7,
  lessons = 5,
  now = new Date(),
) {
  const completed = history
    .filter((s) => s.completedAt)
    .sort((a, b) => Date.parse(a.completedAt!) - Date.parse(b.completedAt!));
  const last = completed.filter((s) => s.mode === "assessment").at(-1);
  const anchor = last ?? completed[0];
  const since = last ? completed.slice(completed.indexOf(last) + 1) : completed;
  const dateNumber = (d: Date) =>
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
  return (
    !!anchor &&
    (since.filter((s) => s.mode !== "assessment").length >= lessons ||
      dateNumber(now) - dateNumber(new Date(anchor.completedAt!)) >= days)
  );
}
export function trend(history: Session[]) {
  const checks = history.filter(
    (s) => s.mode === "assessment" && s.completedAt,
  );
  const last = checks.at(-1),
    prior = checks.at(-2);
  if (!last) return "No progress check completed yet.";
  if (!prior)
    return "First progress check recorded. A second check will establish a comparison.";
  const a = breakdown(prior),
    b = breakdown(last);
  if (a.score === null || b.score === null)
    return "Not enough assessed answers to compare checks.";
  return `Latest check: ${b.score}% (${b.assessed}/${b.total} assessed); previous: ${a.score}% (${a.assessed}/${a.total} assessed). ${b.score > a.score ? "Higher" : b.score < a.score ? "Lower" : "Similar"} observed performance. Different questions and assistance can affect this comparison; this is not a CEFR certification.`;
}
export function rewards(history: Session[], now = new Date()) {
  const completed = history.filter((s) => s.completedAt);
  const xp = completed.reduce((n, s) => {
    const attempted = s.attempts.filter(
      (t, i, all) =>
        t.status !== "skipped" &&
        all.findIndex((x) => x.activityId === t.activityId) === i,
    ).length;
    return n + (attempted ? 10 + attempted * 5 : 0);
  }, 0);
  const mastered = skills.filter((skill) =>
    completed.some((s) => {
      const b = breakdown(s, skill);
      return (
        b.assessed === b.total &&
        b.score !== null &&
        b.score >= 90 &&
        !b.assisted
      );
    }),
  );
  const date = new Date(now);
  const weekday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - weekday);
  date.setHours(0, 0, 0, 0);
  return {
    xp,
    stars: Math.floor(xp / 50),
    badges: mastered.map((s) => `${s} practice star`),
    weekly: completed.filter(
      (s) => Date.parse(s.completedAt!) >= date.getTime(),
    ).length,
  };
}
