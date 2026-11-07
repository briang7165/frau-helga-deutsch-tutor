import { useEffect, useRef, useState } from "react";
import {
  activities,
  clock,
  emptyState,
  remediation,
  score,
  streak,
  type Session,
  type State,
} from "./domain";
import {
  localProgressRepository as storage,
  mockLessonProvider as lessons,
  mockReportDispatcher as reports,
  mockTranscriptionProvider as transcription,
  browserSpeechProvider,
} from "./providers";
import { MicrophoneControls, VoiceControls } from "./SpeechControls";

export default function App() {
  const [state, setState] = useState<State>(() => storage.load());
  const [running, setRunning] = useState(false);
  const [answer, setAnswer] = useState("");
  const [storageOk, setStorageOk] = useState(true);
  const [view, setView] = useState<"classroom" | "progress">("classroom");
  const [review, setReview] = useState<Session | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const current = state.current;
  const activity = lessons.getActivities()[current?.index ?? 0];
  const attempts =
    current?.attempts.filter((a) => a.activityId === activity.id) ?? [];
  const latest = attempts.at(-1);
  const completed = current?.completedAt;
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setStorageOk(storage.save(state));
  }, [state]);
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const delta = now - last;
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
    const timer = window.setInterval(tick, 1000);
    const hide = () => {
      tick();
      setRunning(false);
      browserSpeechProvider.stop();
    };
    const save = () => {
      storage.save(stateRef.current);
    };
    const visibility = () => {
      if (document.hidden) hide();
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [running]);
  useEffect(() => {
    setAnswer("");
    heading.current?.focus();
  }, [current?.index, current?.id, completed]);

  function start() {
    setState((s) => ({
      ...s,
      current: {
        id: crypto.randomUUID(),
        index: 0,
        attempts: [],
        elapsedMs: 0,
      },
    }));
    setReview(null);
    setView("classroom");
    setRunning(true);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || !current || !running) return;
    const text =
      activity.skill === "speaking"
        ? (await transcription.transcribe(null, answer)).text
        : answer;
    const result = lessons.evaluate(activity, text);
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
  }
  function next(skip = false) {
    if (!current) return;
    const updated = {
      ...current,
      attempts:
        skip && !latest
          ? [
              ...current.attempts,
              { activityId: activity.id, score: 0, kind: "skipped" as const },
            ]
          : current.attempts,
    };
    if (current.index === activities.length - 1) {
      const finished = { ...updated, completedAt: new Date().toISOString() };
      setState((s) => ({
        ...s,
        current: finished,
        history: [...s.history, finished],
      }));
      setRunning(false);
    } else
      setState((s) => ({
        ...s,
        current: { ...updated, index: current.index + 1 },
      }));
    browserSpeechProvider.stop();
  }
  function pause() {
    setRunning(false);
    browserSpeechProvider.stop();
  }
  const reportSession = review ?? (completed ? current : null);
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
        <span className="mode">
          <span /> LOCAL DEMO · NO SERVICES
        </span>
      </header>
      <div className="layout">
        <aside className="sidebar">
          <p className="eyebrow">IHR KLASSENZIMMER</p>
          <nav aria-label="Main navigation">
            <button
              aria-current={view === "classroom" ? "page" : undefined}
              onClick={() => {
                setView("classroom");
                setReview(null);
              }}
            >
              01 <span>Classroom</span>
            </button>
            <button
              aria-current={view === "progress" ? "page" : undefined}
              onClick={() => {
                pause();
                setView("progress");
                setReview(null);
              }}
            >
              02 <span>My progress</span>
            </button>
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
              Browser storage is unavailable or full. This session works, but
              progress may be lost on reload.
            </p>
          )}
          <div className="page-heading">
            <div>
              <p className="eyebrow">DEUTSCH, MIT GEDULD.</p>
              <h1>
                {view === "progress"
                  ? "Your learning notebook"
                  : reportSession
                    ? "Gut gemacht. Let’s review."
                    : "Guten Tag. Nehmen Sie Platz."}
              </h1>
            </div>
            <span className="level">
              A2 <small>self-assessed</small>
            </span>
          </div>
          <p className="intro">
            A firm hand, a little humor, and one useful sentence at a time.
          </p>
          <div className="stats">
            <div>
              <span>YOUR STARTING POINT</span>
              <strong>
                A2 <small>→ B1</small>
              </strong>
              <p>Self-assessed · not certified</p>
            </div>
            <div>
              <span>LESSONS COMPLETED</span>
              <strong>{state.history.length}</strong>
              <p>Your local demo sessions</p>
            </div>
            <div>
              <span>CURRENT STREAK</span>
              <strong>
                {streak(state.history)} <small>days</small>
              </strong>
              <p>Based on completion dates</p>
            </div>
          </div>
          {reportSession ? (
            <Report session={reportSession} onStart={start} />
          ) : view === "progress" ? (
            <section className="card">
              <p className="eyebrow">SAVED ON THIS DEVICE</p>
              <h2>Recent lessons</h2>
              {state.history.length === 0 ? (
                <p>No completed lessons yet. Your notebook is waiting.</p>
              ) : (
                <ul className="history">
                  {[...state.history].reverse().map((s) => (
                    <li key={s.id}>
                      <div>
                        <strong>Ein Wochenende am Rhein</strong>
                        <p>
                          {new Date(s.completedAt!).toLocaleDateString()} ·{" "}
                          {clock(s.elapsedMs)} active · {score(s)}%
                        </p>
                      </div>
                      <button onClick={() => setReview(s)}>View report</button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="muted">
                This is a fictional practice scenario. Only attempt outcomes and
                elapsed time are saved; free-text answers and audio are not
                stored.
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
                  A train journey, a visit, and a little conversation. Today
                  we’ll practice the dative and make a plan for the weekend.
                </p>
                <div className="tags">
                  <span>30-minute target</span>
                  <span>6 activities</span>
                  <span>5 skills</span>
                </div>
                <button className="primary" onClick={start}>
                  Start lesson <span aria-hidden="true">→</span>
                </button>
                <small>Take your time. You can pause whenever you need.</small>
              </div>
              <div className="lesson-board" lang="de">
                <span>HEUTE AUF DEM PLAN</span>
                <p>
                  Mit wem?
                  <br />
                  <em>Mit meinem Freund.</em>
                </p>
                <hr />
                <p>
                  Wohin?
                  <br />
                  <em>In den Park.</em>
                </p>
                <small>
                  „Auch die Artikel brauchen Ordnung.“
                  <br />— Frau Helga
                </small>
              </div>
            </section>
          ) : (
            <section className="classroom">
              <div className="lesson-top">
                <div>
                  <p className="eyebrow">EIN WOCHENENDE AM RHEIN</p>
                  <h2 ref={heading} tabIndex={-1}>
                    {activity.title}
                  </h2>
                </div>
                <div className="time">
                  <strong>{clock(current.elapsedMs)}</strong>
                  <span>active · 30 min target</span>
                  <button
                    onClick={() => (running ? pause() : setRunning(true))}
                  >
                    {running ? "Pause lesson" : "Resume lesson"}
                  </button>
                </div>
              </div>
              <ol className="steps" aria-label="Lesson activities">
                {activities.map((a, i) => (
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
                    Completed answers are saved. Your timer is paused. Resume
                    when you’re ready.
                  </p>
                  <button className="primary" onClick={() => setRunning(true)}>
                    Continue lesson
                  </button>
                </div>
              ) : (
                <div className="activity-grid">
                  <article className="card exercise">
                    <p className="eyebrow">
                      {activity.skill} · ABOUT {activity.minutes} MINUTES
                    </p>
                    <h3>{activity.prompt}</h3>
                    {activity.text && (
                      <>
                        {activity.skill !== "reading" && (
                          <VoiceControls
                            key={activity.id}
                            text={activity.text}
                          />
                        )}
                        {activity.skill === "listening" ? (
                          <details>
                            <summary>
                              Show listening text / text-only fallback
                            </summary>
                            <blockquote lang="de">{activity.text}</blockquote>
                          </details>
                        ) : (
                          <blockquote lang="de">{activity.text}</blockquote>
                        )}
                      </>
                    )}
                    {activity.skill === "speaking" && (
                      <MicrophoneControls key={activity.id} />
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
                              aria-pressed={answer === c}
                              key={c}
                              onClick={() => setAnswer(c)}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      )}
                      <label htmlFor="answer">
                        {activity.skill === "speaking"
                          ? "Manual transcript"
                          : "Your answer"}
                      </label>
                      <textarea
                        id="answer"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder={
                          activity.skill === "speaking"
                            ? "Type what you said, using the model reply…"
                            : "Ihre Antwort…"
                        }
                      />
                      <p className="input-help">
                        Use fictional practice text. Free text stays in memory
                        and is cleared between activities.
                      </p>
                      <div className="actions">
                        <button
                          className="primary"
                          disabled={!answer.trim()}
                          type="submit"
                        >
                          {latest ? "Check again" : "Check answer"}
                        </button>
                        <button type="button" onClick={() => next(!latest)}>
                          {latest
                            ? current.index === activities.length - 1
                              ? "Finish lesson"
                              : "Next activity"
                            : "Skip activity"}
                        </button>
                      </div>
                    </form>
                    {latest && (
                      <div className={`feedback ${latest.kind}`} role="status">
                        <strong>
                          {latest.kind === "correct"
                            ? "Sehr gut. Das stimmt."
                            : latest.kind === "minor"
                              ? "Understood. A small detail for our section review."
                              : latest.kind === "major"
                                ? "Da stimmt etwas noch nicht."
                                : "This answer is outside the demo’s accepted patterns."}
                        </strong>
                        {(latest.kind === "major" ||
                          latest.kind === "unrecognized") && (
                          <p>
                            {remediation(activity, attempts)} Unrecognized
                            answers score 0 in this limited rubric; that does
                            not prove your German is wrong.
                          </p>
                        )}
                        {latest.kind === "correct" && activity.id === "s2" && (
                          <p lang="de">
                            Das klingt gut. Viel Freude am Wochenende! Und
                            vergessen Sie die Artikel nicht.
                          </p>
                        )}
                      </div>
                    )}
                    {latest && (
                      <details className="section-review">
                        <summary>Section review & model answer</summary>
                        <p>
                          {attempts.some((a) => a.kind === "minor")
                            ? "Minor correction: German nouns and the start of a sentence need capitals. "
                            : ""}
                          {activity.rule}
                        </p>
                        <p lang="de">{activity.model}</p>
                        <p>
                          First-answer score: {attempts[0].score}%. Retries are
                          practice and do not replace the first score.
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
                      Think first. Then try. Mistakes tell us what to practice
                      next — they are not a character flaw.
                    </p>
                    <hr />
                    <p>
                      <strong>Today’s focus</strong>
                      <br />
                      Dative after <i>mit</i>, useful travel words, and clear
                      sentences.
                    </p>
                    <p className="muted">
                      Scripted local lesson. Speaking scores reflect transcript
                      text only, never pronunciation.
                    </p>
                  </aside>
                </div>
              )}
            </section>
          )}
          <footer className="privacy-footer">
            <p>
              Local M1 prototype · No AI calls · No email sent · No audio saved
            </p>
            <button
              className="text-button"
              onClick={() => {
                if (
                  window.confirm(
                    "Delete all saved demo progress on this device?",
                  )
                ) {
                  pause();
                  storage.clear();
                  setState(emptyState());
                  setReview(null);
                  setAnswer("");
                }
              }}
            >
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
}: {
  session: Session;
  onStart: () => void;
}) {
  const result = reports.preview(session);
  return (
    <section className="card report">
      <div className="report-heading">
        <div>
          <p className="eyebrow">SPOUSE REPORT CARD</p>
          <h2>Frau Helgas Tagesbericht</h2>
        </div>
        <span className="preview-badge">{result.status}</span>
      </div>
      <p lang="de">{result.lead}</p>
      <p>
        <strong>{score(session)}% overall</strong> · {clock(session.elapsedMs)}{" "}
        active time · 30-minute target
      </p>
      <p className="muted">
        Scores use the first answer for each activity. Skips and unrecognized
        answers score 0; retries do not inflate grades. Speaking measures typed
        transcript accuracy only. CEFR starting level A2 is self-assessed, not
        certified.
      </p>
      <div className="score-grid">
        {result.scores.map((s) => (
          <div key={s.skill}>
            <span>{s.skill}</span>
            <strong>
              {s.score === null ? "Not attempted" : `${s.score}%`}
            </strong>
            <meter
              min={0}
              max={100}
              value={s.score ?? 0}
              aria-label={`${s.skill} score`}
            />
          </div>
        ))}
      </div>
      <div className="report-columns">
        <div>
          <h3>What went well</h3>
          {result.strengths.length ? (
            <ul>
              {result.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : (
            <p>
              No mastered items recorded yet. We will work through them
              patiently.
            </p>
          )}
          <h3>Next lesson goals</h3>
          <ul>
            {result.goals.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Mistakes & corrections</h3>
          {result.mistakes.length ? (
            <ul>
              {result.mistakes.map((m) => (
                <li key={m.title}>
                  <strong>
                    {m.title}
                    {m.skipped ? " — skipped, not assessed" : ""}
                  </strong>
                  <p>{m.rule}</p>
                  <p lang="de">Model: {m.model}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              All recorded answers matched the model patterns. Sehr ordentlich.
            </p>
          )}
        </div>
      </div>
      <p className="notice">
        Preview only. No recipient is configured, and nothing has been sent.
        Original free-text answers are not retained.
      </p>
      <button className="primary" onClick={onStart}>
        Practice lesson again
      </button>
    </section>
  );
}
