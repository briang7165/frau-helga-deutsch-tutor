import {
  emptyState,
  messages,
  sessionActivities,
  type Attempt,
  type Criterion,
  type Session,
  type State,
  type Status,
} from "./domain";
export const storageKey = "frau-helga-progress-v2";
export const legacyKey = "frau-helga-m1-v1";
const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw Error("Expected an object");
  return v as Record<string, unknown>;
};
const number = (v: unknown, min: number, max: number): number => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
    throw Error("Invalid number");
  return v;
};
function readAttempt(raw: unknown, legacy: boolean): Attempt {
  const x = record(raw);
  if (typeof x.activityId !== "string") throw Error("Invalid activity");
  if (legacy) {
    const scores: Record<string, number> = {
      correct: 100,
      minor: 90,
      major: 0,
      unrecognized: 0,
      skipped: 0,
    };
    if (
      typeof x.kind !== "string" ||
      !Object.hasOwn(scores, x.kind) ||
      x.score !== scores[x.kind]
    )
      throw Error("Invalid M1 outcome");
    const status: Status =
      x.kind === "correct"
        ? "correct"
        : x.kind === "minor"
          ? "partial"
          : x.kind === "major"
            ? "incorrect"
            : x.kind === "skipped"
              ? "skipped"
              : "needs_review";
    const unscored = status === "skipped" || status === "needs_review";
    return {
      activityId: x.activityId,
      score: unscored ? null : (x.score as number),
      status,
      rubric_parts: unscored
        ? []
        : [
            {
              criterion: "legacy",
              awarded: x.score as number,
              possible: 100,
              message: messages.legacy,
            },
          ],
      error_tags: [],
      assisted: false,
      confidence: unscored ? "limited" : "high",
      legacyScore: x.score as number,
    };
  }
  const statuses: Status[] = [
    "correct",
    "partial",
    "incorrect",
    "needs_review",
    "skipped",
  ];
  if (
    !statuses.includes(x.status as Status) ||
    typeof x.assisted !== "boolean" ||
    !["high", "limited"].includes(x.confidence as string)
  )
    throw Error("Invalid outcome");
  const unscored = x.status === "needs_review" || x.status === "skipped";
  const score = unscored ? null : number(x.score, 0, 100);
  if (unscored && x.score !== null) throw Error("Unscored result has a grade");
  if (
    !Array.isArray(x.rubric_parts) ||
    !Array.isArray(x.error_tags) ||
    x.rubric_parts.length > 5
  )
    throw Error("Invalid rubric");
  const rubric_parts = x.rubric_parts.map((v) => {
    const p = record(v);
    if (!Object.hasOwn(messages, p.criterion as string))
      throw Error("Unknown criterion");
    const criterion = p.criterion as Criterion;
    return {
      criterion,
      awarded: number(p.awarded, 0, 100),
      possible: number(p.possible, 0, 100),
      message: messages[criterion],
    };
  });
  if (
    rubric_parts.some((p) => p.awarded > p.possible) ||
    (!unscored &&
      (rubric_parts.reduce((n, p) => n + p.possible, 0) !== 100 ||
        rubric_parts.reduce((n, p) => n + p.awarded, 0) !== score)) ||
    (unscored && rubric_parts.length)
  )
    throw Error("Inconsistent rubric");
  if (
    (x.status === "correct" && score !== 100) ||
    (x.status === "incorrect" && score !== 0) ||
    (x.status === "partial" && (score === null || score <= 0 || score >= 100))
  )
    throw Error("Inconsistent grade");
  const allowed = [
    "meaning",
    "capitalization",
    "spelling",
    "case_articles",
    "verb",
    "word_order",
  ];
  if (x.error_tags.some((t) => !allowed.includes(t as string)))
    throw Error("Unknown error tag");
  return {
    activityId: x.activityId,
    score,
    status: x.status as Status,
    rubric_parts,
    error_tags: x.error_tags as string[],
    assisted: x.assisted,
    confidence: x.confidence as "high" | "limited",
    ...(x.legacyScore !== undefined
      ? { legacyScore: number(x.legacyScore, 0, 100) }
      : {}),
  };
}
function readSession(raw: unknown, legacy: boolean): Session {
  const x = record(raw);
  if (typeof x.id !== "string" || !/^[\w-]{1,100}$/.test(x.id))
    throw Error("Invalid lesson ID");
  const mode = x.mode === undefined ? "practice" : x.mode;
  if (mode !== "practice" && mode !== "assessment") throw Error("Invalid mode");
  const s: Session = {
    id: x.id,
    index: number(x.index, 0, 5),
    elapsedMs: number(x.elapsedMs, 0, 1e12),
    attempts: [],
    ...(legacy
      ? {}
      : {
          mode,
          variant: number(x.variant ?? 0, 0, 1e6),
          targetMinutes: number(x.targetMinutes ?? 30, 5, 90),
        }),
  };
  if (
    !Number.isInteger(s.index) ||
    !Number.isInteger(s.variant ?? 0) ||
    s.index >= sessionActivities(s).length
  )
    throw Error("Invalid lesson position");
  if (x.completedAt !== undefined) {
    if (
      typeof x.completedAt !== "string" ||
      !/^\d{4}-\d\d-\d\dT/.test(x.completedAt) ||
      !Number.isFinite(Date.parse(x.completedAt))
    )
      throw Error("Invalid completion date");
    s.completedAt = x.completedAt;
  }
  if (!Array.isArray(x.attempts) || x.attempts.length > 1000)
    throw Error("Invalid attempts");
  s.attempts = x.attempts.map((t) => readAttempt(t, legacy));
  if (
    s.attempts.some(
      (t) => !sessionActivities(s).some((a) => a.id === t.activityId),
    )
  )
    throw Error("Unknown activity");
  return s;
}
export function decodeState(raw: string): State {
  const x = record(JSON.parse(raw));
  if (x.version !== 1 && x.version !== 2)
    throw Error("Unsupported data version");
  if (!Array.isArray(x.history) || x.history.length > 10000)
    throw Error("Invalid history");
  const history = x.history.map((s) => readSession(s, x.version === 1));
  if (
    history.some((s) => !s.completedAt) ||
    new Set(history.map((s) => s.id)).size !== history.length
  )
    throw Error("Invalid history entries");
  return {
    version: 2,
    current:
      x.current === null ? null : readSession(x.current, x.version === 1),
    history,
  };
}
export function parseState(raw: string | null): State {
  try {
    return raw ? decodeState(raw) : emptyState();
  } catch {
    return emptyState();
  }
}
let blocked = false;
export const localProgressRepository = {
  warning: "",
  load(): State {
    blocked = false;
    this.warning = "";
    try {
      const raw =
        localStorage.getItem(storageKey) ?? localStorage.getItem(legacyKey);
      return raw ? decodeState(raw) : emptyState();
    } catch {
      blocked = true;
      this.warning =
        "Saved progress could not be read. Original data is preserved; export/repair it or explicitly delete progress to start fresh.";
      return emptyState();
    }
  },
  save(s: State): boolean {
    if (blocked) return false;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(decodeState(JSON.stringify(s))),
      );
      return true;
    } catch {
      return false;
    }
  },
  clear(): boolean {
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(legacyKey);
      blocked = false;
      this.warning = "";
      return true;
    } catch {
      return false;
    }
  },
  replace(s: State): boolean {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(decodeState(JSON.stringify(s))),
      );
      blocked = false;
      this.warning = "";
      return true;
    } catch {
      return false;
    }
  },
};
