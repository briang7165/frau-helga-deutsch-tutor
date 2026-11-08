import { useEffect, useRef, useState } from "react";
import {
  activities,
  assessmentDue,
  breakdown,
  clock,
  emptyState,
  remediation,
  rewards,
  score,
  sessionActivities,
  streak,
  trend,
  unscored,
  type Session,
  type State,
} from "./domain";
import {
  localProgressRepository as storage,
  mockLessonProvider as lessons,
  mockReportDispatcher as reports,
  browserSpeechProvider,
} from "./providers";
import { MicrophoneControls, VoiceControls } from "./SpeechControls";
import { useSettings } from "./preferences";
import { SettingsPanel } from "./SettingsPanel";
import { WordHelp, instructions } from "./WordHelp";
import { sounds } from "./sounds";
const percent = (n: number | null) => (n === null ? "Not graded" : `${n}%`);
export default function App() {
  const [state, setState] = useState<State>(() => storage.load());
  const [running, setRunning] = useState(false);
  const [answer, setAnswer] = useState("");
  const [assisted, setAssisted] = useState(false);
  const [language, setLanguage] = useState("de-DE");
  const [storageOk, setStorageOk] = useState(true);
  const [view, setView] = useState<"classroom" | "progress" | "settings">(
    "classroom",
  );
  const [review, setReview] = useState<Session | null>(null);
  const [rewardNotice, setRewardNotice] = useState("");
  const { settings, update } = useSettings();
  const heading = useRef<HTMLHeadingElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const current = state.current;
  const list = current ? sessionActivities(current) : activities;
  const activity = list[current?.index ?? 0];
  const attempts =
    current?.attempts.filter((t) => t.activityId === activity.id) ?? [];
  const latest = attempts.at(-1);
  const completed = current?.completedAt;
  const earned = rewards(state.history);
  const reportSession =
    review ?? (view === "classroom" && completed ? current : null);
  useEffect(() => {
    setStorageOk(storage.save(state));
  }, [state]);
  useEffect(() => {
    sounds.stop();
  }, [settings.sfx, settings.muted, settings.sfxVolume]);
  useEffect(() => () => sounds.close(), []);
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const tick = () => {
      const now = performance.now(),
        delta = now - last;
      last = now;
      setState((s) =>
        s.current && !s.current.completedAt
          ? {
              ...s,
              current: { ...s.current, elapsedMs: s.current.elapsedMs + delta },
            }
          : s,
      );
    };
    const timer = setInterval(tick, 1000);
    const hide = () => {
      if (document.hidden) {
        tick();
        setRunning(false);
        browserSpeechProvider.stop();
        sounds.stop();
      }
    };
    const save = () => {
      const s = stateRef.current;
      storage.save(
        s.current && !s.current.completedAt
          ? {
              ...s,
              current: {
                ...s.current,
                elapsedMs: s.current.elapsedMs + performance.now() - last,
              },
            }
          : s,
      );
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", save);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", save);
    };
  }, [running]);
  useEffect(() => {
    setAnswer("");
    setAssisted(false);
    setLanguage(activity.skill === "vocabulary" ? "en" : "de-DE");
    if (!completed) setRewardNotice("");
    heading.current?.focus();
  }, [current?.id, current?.index, completed]);
  useEffect(() => {
    setState((s) =>
      s.current && !s.current.completedAt && s.current.mode !== "assessment"
        ? {
            ...s,
            current: { ...s.current, targetMinutes: settings.targetMinutes },
          }
        : s,
    );
  }, [settings.targetMinutes]);
  function start(mode: "practice" | "assessment" = "practice") {
    if (current && !current.completedAt) return;
    const variant = state.history.filter((s) => s.mode === "assessment").length;
    setState((s) => ({
      ...s,
      current: {
        id: crypto.randomUUID(),
        index: 0,
        attempts: [],
        elapsedMs: 0,
        mode,
        variant: mode === "assessment" ? variant : 0,
        targetMinutes: mode === "assessment" ? 15 : settings.targetMinutes,
      },
    }));
    setView("classroom");
    setReview(null);
    setRunning(true);
  }
  function pause() {
    setRunning(false);
    browserSpeechProvider.stop();
    sounds.stop();
  }
  function navigate(next: typeof view) {
    pause();
    setView(next);
    setReview(null);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || !current || !running) return;
    const result = lessons.evaluate(activity, answer, assisted);
    setState((s) =>
      s.current
        ? {
            ...s,
            current: {
              ...s.current,
              attempts: [...s.current.attempts, result],
            },
          }
        : s,
    );
    if (!latest && result.score !== null && result.score >= 90) {
      setRewardNotice("Sehr gut. A careful answer — one step forward.");
      void sounds.play("success", settings);
    } else if (result.status === "incorrect")
      void sounds.play("incorrect", settings);
  }
  function next() {
    if (!current) return;
    const updated = {
      ...current,
      attempts: latest
        ? current.attempts
        : [...current.attempts, unscored(activity, "skipped", assisted)],
    };
    if (current.index === list.length - 1) {
      const finished = { ...updated, completedAt: new Date().toISOString() };
      const history = [...state.history, finished];
      setState((s) => ({ ...s, current: finished, history }));
      setRunning(false);
      const badge = rewards(history).badges.length > earned.badges.length;
      setRewardNotice(
        badge
          ? "A new practice star. Sehr ordentlich!"
          : "Lesson complete. Steady effort earns its Goldsterne.",
      );
      void sounds.play(badge ? "badge" : "completion", settings);
    } else
      setState((s) => ({
        ...s,
        current: { ...updated, index: current.index + 1 },
      }));
    browserSpeechProvider.stop();
  }
  function deleteProgress() {
    if (
      window.confirm(
        "Delete all saved progress, including the original M1 records? Settings will be kept.",
      )
    ) {
      pause();
      if (!storage.clear()) {
        setStorageOk(false);
        return;
      }
      setState(emptyState());
      setReview(null);
      setAnswer("");
    }
  }
  const due =
    settings.assessmentEnabled &&
    assessmentDue(
      state.history,
      settings.assessmentDays,
      settings.assessmentLessons,
    );
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to classroom
      </a>
      <header className="topbar">
        <a href="#main" className="brand">
          <span className="monogram">FH</span>
          <span>
            Frau Helga<small>DEUTSCH COACH</small>
          </span>
        </a>
        <div className="global-sound">
          <button
            aria-pressed={settings.muted}
            onClick={() => update({ muted: !settings.muted })}
          >
            {settings.muted ? "Unmute effects" : "Mute effects"}
          </button>
          <label>
            Effects volume
            <input
              aria-label="Global sound effects volume"
              type="range"
              min="0"
              max="100"
              value={settings.sfxVolume}
              onChange={(e) => update({ sfxVolume: +e.target.value })}
            />
          </label>
          <small>
            {settings.sfx
              ? "Effects enabled"
              : "Effects off — enable in Settings"}
          </small>
        </div>
      </header>
      <div className="layout">
        <aside className="sidebar">
          <p className="eyebrow">IHR KLASSENZIMMER</p>
          <nav aria-label="Main navigation">
            {(["classroom", "progress", "settings"] as const).map((item, i) => (
              <button
                key={item}
                aria-current={view === item ? "page" : undefined}
                onClick={() => navigate(item)}
              >
                0{i + 1}{" "}
                <span>
                  {item === "classroom"
                    ? "Classroom"
                    : item === "progress"
                      ? "My progress"
                      : "Settings"}
                </span>
              </button>
            ))}
          </nav>
          <div className="teacher-note">
            <span className="small-seal">H</span>
            <p lang="de">
              „Ordnung hilft.
              <br />
              Übung auch.“
            </p>
            <small>
              A little structure.
              <br />A little practice. Every day.
            </small>
          </div>
          <p className="sidebar-footer">
            A2 → B1
            <br />
            <span>One sentence at a time.</span>
          </p>
        </aside>
        <main id="main">
          {!storageOk && (
            <p className="warning" role="alert">
              Browser storage is unavailable, full, or contains unreadable data.{" "}
              {storage.warning ||
                "This session works, but changes may not survive reload."}
            </p>
          )}
          <div className="page-heading">
            <div>
              <p className="eyebrow">LOCAL & FREE · NO LIVE AI</p>
              <h1>
                {view === "settings"
                  ? "Make yourself comfortable."
                  : view === "progress"
                    ? "Your learning notebook"
                    : reportSession
                      ? "Gut gemacht. Let’s review."
                      : "Guten Tag. Nehmen Sie Platz."}
              </h1>
            </div>
            <span className="level">
              A2<small>self-assessed</small>
            </span>
          </div>
          {view === "settings" ? (
            <SettingsPanel
              state={state}
              onDelete={deleteProgress}
              onImport={(s) => {
                if (!storage.replace(s)) return false;
                setState(s);
                return true;
              }}
            />
          ) : (
            <>
              <p className="intro">
                A firm hand, a little humor, and one useful sentence at a time.
              </p>
              <div className="stats">
                <div>
                  <span>COMPLETED SESSIONS</span>
                  <strong>{state.history.length}</strong>
                  <p>Actual local practice & checks</p>
                </div>
                <div>
                  <span>GOLDSTERNE · EFFORT REWARDS</span>
                  <strong>
                    {earned.stars} ★ <small>{earned.xp} XP</small>
                  </strong>
                  <p>Separate from proficiency scores</p>
                </div>
                <div>
                  <span>CURRENT STREAK</span>
                  <strong>
                    {streak(state.history)} <small>days</small>
                  </strong>
                  <p>A2 self-assessed · not certified</p>
                </div>
              </div>
              <div className="weekly">
                <span>
                  Weekly challenge: {Math.min(earned.weekly, 3)}/3 sessions
                </span>
                <progress
                  max={3}
                  value={Math.min(earned.weekly, 3)}
                  aria-label="Weekly challenge progress"
                />
                <small>
                  Earn stars through practice, never by changing grades.
                </small>
              </div>
              {due && (
                <div className="notice" role="status">
                  Your optional progress check is ready:{" "}
                  {settings.assessmentDays} days or {settings.assessmentLessons}{" "}
                  lessons, whichever comes first.{" "}
                  {current && !completed ? (
                    "Finish your current lesson first."
                  ) : (
                    <button onClick={() => start("assessment")}>
                      Start progress check
                    </button>
                  )}
                </div>
              )}
              {rewardNotice && (
                <p className="celebration" role="status">
                  <span aria-hidden="true">✦</span> {rewardNotice}
                </p>
              )}
              {reportSession ? (
                <Report
                  session={reportSession}
                  onStart={() => start()}
                  history={state.history}
                />
              ) : view === "progress" ? (
                <section className="card">
                  <h2>Recent lessons & progress checks</h2>
                  <p>{trend(state.history)}</p>
                  <p>
                    A2 self-assessed — progress check, not a certified CEFR
                    exam. Four original local forms rotate in order; after four
                    checks, forms repeat.
                  </p>
                  <button
                    disabled={!!current && !completed}
                    onClick={() => start("assessment")}
                  >
                    Take a progress check
                  </button>
                  <h3>Practice mastery badges</h3>
                  <p>
                    {earned.badges.join(" · ") ||
                      "No practice stars yet. They require assessed, unassisted first answers of at least 90% for a skill."}
                  </p>
                  {!state.history.length ? (
                    <p>No completed lessons yet. Your notebook is waiting.</p>
                  ) : (
                    <ul className="history">
                      {[...state.history].reverse().map((s) => (
                        <li key={s.id}>
                          <div>
                            <strong>
                              {s.mode === "assessment"
                                ? `Progress check · form ${((s.variant ?? 0) % 4) + 1}`
                                : "Ein Wochenende am Rhein"}
                            </strong>
                            <p>
                              {new Date(s.completedAt!).toLocaleDateString()} ·{" "}
                              {clock(s.elapsedMs)} · {percent(score(s))} ·{" "}
                              {breakdown(s).assessed}/
                              {sessionActivities(s).length} assessed
                            </p>
                          </div>
                          <button onClick={() => setReview(s)}>
                            View report
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="muted">
                    First attempts stay fixed. Unknown answers are unscored, not
                    marked wrong. Only structured outcomes are saved.
                  </p>
                </section>
              ) : !current ? (
                <section className="lesson-launch">
                  <div>
                    <p className="eyebrow">LESSON 01 · A2 PRACTICE</p>
                    <h2>
                      Ein Wochenende
                      <br />
                      am Rhein
                    </h2>
                    <p>
                      A train journey, a visit, and a little conversation.
                      English instructions guide every step. Today we’ll
                      practice the dative and plan a weekend.
                    </p>
                    <div className="tags">
                      <span>{settings.targetMinutes}-minute target</span>
                      <span>6 activities</span>
                      <span>5 skills</span>
                    </div>
                    <button className="primary" onClick={() => start()}>
                      Start lesson <span aria-hidden="true">→</span>
                    </button>
                    <small>
                      Pause whenever you need. Your completed outcomes are
                      saved.
                    </small>
                  </div>
                  <div className="lesson-board" lang="de">
                    <span>HEUTE AUF DEM PLAN</span>
                    <p>
                      Mit wem?
                      <br />
                      <em>Mit meiner Schwester.</em>
                    </p>
                    <hr />
                    <p>
                      Wohin?
                      <br />
                      <em>Nach Hause.</em>
                    </p>
                    <small>
                      „Schritt für Schritt.“
                      <br />— Frau Helga
                    </small>
                  </div>
                </section>
              ) : (
                <section className="classroom">
                  <div className="lesson-top">
                    <div>
                      <p className="eyebrow">
                        {current.mode === "assessment"
                          ? `A2 PROGRESS CHECK · FORM ${((current.variant ?? 0) % 4) + 1}`
                          : "EIN WOCHENENDE AM RHEIN"}
                      </p>
                      <h2 ref={heading} tabIndex={-1}>
                        {activity.title}
                      </h2>
                    </div>
                    <div className="time">
                      <strong>{clock(current.elapsedMs)}</strong>
                      <span>
                        active ·{" "}
                        {current.targetMinutes ?? settings.targetMinutes} min
                        target
                      </span>
                      <button
                        onClick={() => (running ? pause() : setRunning(true))}
                      >
                        {running ? "Pause lesson" : "Resume lesson"}
                      </button>
                    </div>
                  </div>
                  <ol className="steps" aria-label="Lesson activities">
                    {list.map((a, i) => (
                      <li
                        key={a.id}
                        aria-current={i === current.index ? "step" : undefined}
                        className={i < current.index ? "done" : ""}
                      >
                        <span>{i < current.index ? "✓" : i + 1}</span>
                        {a.skill}
                      </li>
                    ))}
                  </ol>
                  {!running ? (
                    <div className="paused">
                      <h3>Eine kleine Pause.</h3>
                      <p>
                        Completed outcomes are saved. Recording is stopped and
                        any clip is discarded.
                      </p>
                      <button
                        className="primary"
                        onClick={() => setRunning(true)}
                      >
                        Continue lesson
                      </button>
                    </div>
                  ) : (
                    <div className="activity-grid">
                      <article
                        className="card exercise"
                        key={`${current.id}-${activity.id}`}
                      >
                        <p className="eyebrow">{activity.skill}</p>
                        <div className="instructions" lang="en">
                          <strong>INSTRUCTIONS (ENGLISH)</strong>
                          <p>{instructions(activity)}</p>
                          <small>
                            Your first attempt counts. Plausible unmatched
                            answers are “Needs review — unscored”; skips are
                            missing work. Neither lowers assessed averages.
                          </small>
                        </div>
                        <h3 data-german>{activity.prompt}</h3>
                        <WordHelp
                          activity={activity}
                          onHelp={() => setAssisted(true)}
                        />
                        {activity.text && (
                          <>
                            {activity.skill !== "reading" && (
                              <VoiceControls text={activity.text} />
                            )}{" "}
                            {activity.skill === "listening" ? (
                              <details
                                onToggle={(e) => {
                                  if (e.currentTarget.open) setAssisted(true);
                                }}
                              >
                                <summary>
                                  Show listening text / text-only fallback
                                </summary>
                                <blockquote lang="de" data-german>
                                  {activity.text}
                                </blockquote>
                              </details>
                            ) : (
                              <blockquote lang="de" data-german>
                                {activity.text}
                              </blockquote>
                            )}
                          </>
                        )}
                        {activity.skill === "speaking" && (
                          <MicrophoneControls />
                        )}
                        <form onSubmit={submit}>
                          {activity.choices && (
                            <div
                              className="choices"
                              role="group"
                              aria-label="Suggested answers"
                            >
                              {activity.choices.map((c) => (
                                <button
                                  type="button"
                                  key={c}
                                  aria-pressed={answer === c}
                                  onClick={() => {
                                    setAnswer(c);
                                    if (activity.skill === "speaking")
                                      setAssisted(true);
                                  }}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          )}
                          {activity.skill === "listening" && (
                            <label>
                              Answer language
                              <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                              >
                                <option value="de-DE">German</option>
                                <option value="en">English</option>
                              </select>
                            </label>
                          )}
                          <label htmlFor="answer">
                            {activity.skill === "speaking"
                              ? "Manual transcript"
                              : "Your answer"}
                          </label>
                          <textarea
                            id="answer"
                            lang={language}
                            spellCheck={
                              language === "de-DE"
                                ? settings.germanSpellcheck
                                : settings.englishSpellcheck
                            }
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            maxLength={500}
                            rows={3}
                            placeholder={
                              language === "de-DE"
                                ? "Write in German…"
                                : "Write in English…"
                            }
                          />
                          <p className="input-help">
                            Free text stays in memory. No automatic
                            transcription.{" "}
                            {assisted
                              ? "Help used — marked assisted, with no score penalty."
                              : ""}
                          </p>
                          <div className="actions">
                            <button
                              className="primary"
                              disabled={!answer.trim()}
                              type="submit"
                            >
                              {latest ? "Check again" : "Check answer"}
                            </button>
                            <button type="button" onClick={next}>
                              {latest
                                ? current.index === list.length - 1
                                  ? "Finish lesson"
                                  : "Next activity"
                                : "Skip activity"}
                            </button>
                          </div>
                        </form>
                        {latest && (
                          <div
                            className={`feedback ${latest.status}`}
                            role="status"
                          >
                            <strong>
                              {latest.status === "correct"
                                ? "Sehr gut. Das stimmt."
                                : latest.status === "partial"
                                  ? `You have demonstrated part of this: ${latest.score}%.`
                                  : latest.status === "needs_review"
                                    ? "Needs review — unscored"
                                    : "This answer does not match the requested meaning."}
                            </strong>
                            <p>
                              {latest.status === "needs_review"
                                ? "The local rules cannot confidently assess this wording. It is excluded from averages. Try a model pattern if you want practice feedback; the first attempt remains unscored."
                                : `Rubric confidence: ${latest.confidence}. ${latest.assisted ? "Assisted answer; no score penalty." : ""}`}
                            </p>
                            {(latest.status === "incorrect" ||
                              latest.status === "partial") && (
                              <p>{remediation(activity, attempts)}</p>
                            )}
                            {settings.detail === "detailed" &&
                              latest.rubric_parts.length > 0 && (
                                <ul>
                                  {latest.rubric_parts.map((p) => (
                                    <li key={p.criterion}>
                                      {p.criterion}: {p.awarded}/{p.possible} —{" "}
                                      {p.message}
                                    </li>
                                  ))}
                                </ul>
                              )}
                          </div>
                        )}
                        {latest && (
                          <details
                            className="section-review"
                            open={
                              (current.index + 1) % settings.reviewEvery === 0
                            }
                            onToggle={(e) => {
                              if (e.currentTarget.open) setAssisted(true);
                            }}
                          >
                            <summary>Section review & model answer</summary>
                            <p>{activity.rule}</p>
                            <p lang="de">{activity.model}</p>
                            <p>
                              First-answer score: {percent(attempts[0].score)}.
                              Retries are practice and never replace it.
                            </p>
                          </details>
                        )}
                      </article>
                      <aside className="coach-card">
                        <p className="eyebrow">FRAU HELGA’S DESK</p>
                        <div className="avatar" aria-hidden="true">
                          H.
                        </div>
                        <h3 lang="de">Schritt für Schritt.</h3>
                        <p>
                          Mistakes show us where to practice. One wrong article
                          does not erase everything you know.
                        </p>
                        <hr />
                        <p>
                          Need a word? Select it in the German material, or open
                          Help and type it.
                        </p>
                        <p className="muted">
                          Text is graded with local rules. A2 is self-assessed,
                          not certified. Audio is never graded.
                        </p>
                      </aside>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
          <footer className="privacy-footer">
            <p>Local M1.1 · No live AI · No email sent · No audio persisted</p>
            <button className="text-button" onClick={deleteProgress}>
              Clear local progress
            </button>
          </footer>
        </main>
      </div>
    </>
  );
}
function Report({
  session,
  onStart,
  history,
}: {
  session: Session;
  onStart: () => void;
  history: Session[];
}) {
  const r = reports.preview(session);
  const previousCheck =
    session.mode === "assessment"
      ? history
          .filter(
            (s) =>
              s.mode === "assessment" &&
              s.id !== session.id &&
              Date.parse(s.completedAt!) < Date.parse(session.completedAt!),
          )
          .at(-1)
      : undefined;
  const tags = [...new Set(session.attempts.flatMap((t) => t.error_tags))];
  return (
    <section className="card report">
      <div className="report-heading">
        <div>
          <p className="eyebrow">
            {session.mode === "assessment"
              ? "PROGRESS CHECK"
              : "SPOUSE REPORT CARD"}
          </p>
          <h2>Frau Helgas Tagesbericht</h2>
        </div>
        <span className="preview-badge">{r.status}</span>
      </div>
      <p>{r.lead}</p>
      <p>
        <strong>
          {r.score === null ? "Not graded overall" : `${r.score}% overall`}
        </strong>{" "}
        · {clock(session.elapsedMs)} active
      </p>
      <p>
        {r.assessed}/{r.total} assessed · {r.needsReview} needs review ·{" "}
        {r.skipped} skipped · {r.missing} missing · {r.assisted} assisted
      </p>
      <p className="muted">
        First attempts only. Skipped and needs-review answers are excluded from
        averages. Speech scores concern manual transcript text only. A2
        self-assessed — progress check, not a certified CEFR exam.
      </p>
      {session.attempts.some((t) => t.legacyScore !== undefined) && (
        <p className="notice">
          Migrated M1 record. Historical numeric grades are retained where
          assessed; old unrecognized/skipped zeroes are now unscored. Original
          M1 records remain in their storage key. No private answers were
          retained, so old grades cannot be recomputed.
        </p>
      )}
      <div className="score-grid">
        {r.scores.map((s) => (
          <div key={s.skill}>
            <span>{s.skill}</span>
            <strong>{percent(s.score)}</strong>
            <small>
              {s.assessed}/{s.total} assessed
            </small>
            {previousCheck && (
              <small className="previous-score">
                Previous: {percent(score(previousCheck, s.skill))} (
                {breakdown(previousCheck, s.skill).assessed}/
                {breakdown(previousCheck, s.skill).total} assessed)
              </small>
            )}
            <meter
              min={0}
              max={100}
              value={s.score ?? 0}
              aria-label={`${s.skill} score`}
            />
          </div>
        ))}
      </div>
      {session.mode === "assessment" && (
        <p>
          {trend(
            history.filter(
              (s) =>
                Date.parse(s.completedAt!) <= Date.parse(session.completedAt!),
            ),
          )}
        </p>
      )}
      <div className="report-columns">
        <div>
          <h3>What went well</h3>
          {r.strengths.length ? (
            <ul>
              {r.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : (
            <p>We are still gathering evidence. Keep practicing, bitte.</p>
          )}
          <h3>Next study recommendations</h3>
          <ul>
            {r.goals.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <p>
            Error categories:{" "}
            {tags.join(", ") || "No categorized errors recorded."}
          </p>
        </div>
        <div>
          <h3>Review & corrections</h3>
          {r.mistakes.length ? (
            <ul>
              {r.mistakes.map((m) => (
                <li key={m.title}>
                  <strong>
                    {m.title} — {m.status.replace("_", " ")}
                  </strong>
                  <p>{m.rule}</p>
                  <p lang="de">Model: {m.model}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>All first answers matched the rubric. Sehr ordentlich.</p>
          )}
        </div>
      </div>
      <p className="notice">
        Preview only. Nothing has been sent. Raw answers are not stored.
      </p>
      <button className="primary" onClick={onStart}>
        Practice lesson again
      </button>
    </section>
  );
}
