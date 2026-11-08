import { useEffect, useRef, useState } from "react";
import { normalize, type Activity } from "./domain";
import { useSettings } from "./preferences";
import { VoiceControls } from "./SpeechControls";
export type WordEntry = {
  term: string;
  meaning: string;
  grammar: string;
  example: string;
};
export interface WordHelpProvider {
  lookup(term: string, activity: Activity): WordEntry | string;
}
const dictionary: Record<string, [string, string, string]> = {
  wald: ["forest", "der Wald; plural: die Wälder.", "Der Wald ist ruhig."],
  hof: ["courtyard", "der Hof; plural: die Höfe.", "Im Hof steht ein Fahrrad."],
  mit: [
    "with",
    "Preposition; takes the dative case.",
    "Mit einer Tasse Tee lerne ich gern.",
  ],
  "mit dem": [
    "with the",
    "Dative masculine or neuter article after mit.",
    "Ich schreibe mit dem Stift.",
  ],
  fährt: [
    "travels / goes by vehicle",
    "Third person singular of fahren.",
    "Der Bus fährt heute langsam.",
  ],
  fahre: [
    "travel / go by vehicle",
    "First person singular of fahren.",
    "Ich fahre gern Rad.",
  ],
  zug: ["train", "der Zug; plural: die Züge.", "Der Zug ist lang."],
  samstag: [
    "Saturday",
    "der Samstag; plural: die Samstage.",
    "Samstag ist mein freier Tag.",
  ],
  freitag: [
    "Friday",
    "der Freitag; plural: die Freitage.",
    "Freitag beginnt der Kurs.",
  ],
  montag: [
    "Monday",
    "der Montag; plural: die Montage.",
    "Montag habe ich Zeit.",
  ],
  wochenende: [
    "weekend",
    "das Wochenende; plural: die Wochenenden.",
    "Das Wochenende ist ruhig.",
  ],
  wohin: [
    "where to",
    "Question word for a destination, not a location.",
    "Wohin läuft die Katze?",
  ],
  besucht: [
    "visits",
    "Third person singular of besuchen.",
    "Er besucht einen Kurs.",
  ],
  besuche: [
    "visit",
    "First person singular of besuchen.",
    "Ich besuche eine Ausstellung.",
  ],
  bruder: [
    "brother",
    "der Bruder; plural: die Brüder.",
    "Ihr Bruder liest gern.",
  ],
  freund: [
    "friend (male)",
    "der Freund; plural: die Freunde.",
    "Ein Freund ruft an.",
  ],
  freundin: [
    "friend (female)",
    "die Freundin; plural: die Freundinnen.",
    "Eine Freundin schreibt mir.",
  ],
  nach: [
    "to / after",
    "Place: to a city; time: after. Choose the sense from context.",
    "Nach der Pause arbeiten wir.",
  ],
  gehen: [
    "go / walk",
    "Infinitive; ich gehe, wir gehen.",
    "Wir gehen langsam.",
  ],
  gehe: [
    "go / walk",
    "First person singular of gehen.",
    "Ich gehe nach Hause.",
  ],
  park: ["park", "der Park; plural: die Parks.", "Der Park ist grün."],
  garten: [
    "garden",
    "der Garten; plural: die Gärten.",
    "Im Garten blühen Blumen.",
  ],
  zoo: ["zoo", "der Zoo; plural: die Zoos.", "Der Zoo öffnet früh."],
  frisches: [
    "fresh",
    "Adjective form; ending depends on the noun and case.",
    "Frisches Wasser steht bereit.",
  ],
  brot: ["bread", "das Brot; plural: die Brote.", "Das Brot ist warm."],
  äpfel: ["apples", "Plural of der Apfel.", "Die Äpfel sind rot."],
  kaufe: ["buy", "First person singular of kaufen.", "Ich kaufe einen Stift."],
  zeitung: [
    "newspaper",
    "die Zeitung; plural: die Zeitungen.",
    "Die Zeitung liegt hier.",
  ],
  morgen: [
    "tomorrow / morning",
    "Lowercase morgen: tomorrow; der Morgen: morning.",
    "Morgen beginnt die Schule.",
  ],
  ausflug: [
    "outing / short trip",
    "der Ausflug; plural: die Ausflüge.",
    "Der Ausflug dauert zwei Stunden.",
  ],
  bahnhof: [
    "train station",
    "der Bahnhof; plural: die Bahnhöfe.",
    "Der Bahnhof ist groß.",
  ],
  fahrkarte: [
    "ticket",
    "die Fahrkarte; plural: die Fahrkarten.",
    "Die Fahrkarte ist gültig.",
  ],
  regenschirm: [
    "umbrella",
    "der Regenschirm; plural: die Regenschirme.",
    "Der Regenschirm ist blau.",
  ],
  bäckerei: [
    "bakery",
    "die Bäckerei; plural: die Bäckereien.",
    "Die Bäckerei öffnet früh.",
  ],
  familie: [
    "family",
    "die Familie; plural: die Familien.",
    "Die Familie wohnt hier.",
  ],
  dort: ["there", "Adverb of place.", "Dort steht ein Tisch."],
  am: [
    "at / on the",
    "Contraction of an dem; often used with days and times.",
    "Am Abend lese ich.",
  ],
};
export const localWordHelp: WordHelpProvider = {
  lookup(term, a) {
    const key = normalize(term);
    if (!/^[\p{L} -]{1,40}$/u.test(key) || key.split(/\s+/).length > 2)
      return "Please choose one word or a short dictionary phrase, not a sentence.";
    const context = normalize(`${a.title} ${a.text ?? ""} ${a.prompt}`);
    if (!context.includes(key))
      return "Choose a word from the current German material so I can explain it in context.";
    if (
      a.skill === "vocabulary" ||
      (["reading", "listening"].includes(a.skill) &&
        a.accepted.some(
          (v) =>
            normalize(v).split(/\s+/).length <= 2 &&
            normalize(v).split(/\s+/).includes(key),
        ))
    )
      return "That term gives away the graded answer here. Try a different word or the instruction help; the answer is reviewed after your attempt.";
    const entry = dictionary[key];
    return entry
      ? { term: key, meaning: entry[0], grammar: entry[1], example: entry[2] }
      : "This word is not in the local dictionary yet. Check the spelling or choose a shorter term. No external lookup was made.";
  },
};
export function instructions(a: Activity) {
  return {
    vocabulary:
      "Choose or type the English meaning of the German word. Synonyms are valid. Meaning is scored; help will not reveal the tested word.",
    reading:
      "Read the German passage, then answer the question in German. A short phrase or a complete sentence is valid. Meaning counts most; spelling and capitals count a little.",
    writing:
      "Translate the English sentence into German. Several word orders and masculine/feminine friend forms are valid. Meaning 40%, verb 25%, word order 20%, case/articles/spelling 15%.",
    listening:
      "Listen to the German sentence, then answer in English or German. Choose your input language below. Meaning counts most. Reading the text fallback is allowed and marked assisted.",
    speaking:
      "Speak in German and type what you said, or type without a microphone. No automatic transcription is enabled. Only the typed text is checked; pronunciation is not graded. Other plausible replies may need review.",
  }[a.skill];
}
export function WordHelp({
  activity,
  onHelp,
}: {
  activity: Activity;
  onHelp: () => void;
}) {
  const { settings } = useSettings();
  const [open, setOpen] = useState(settings.helpOpen),
    [term, setTerm] = useState(""),
    [entry, setEntry] = useState<WordEntry | string | null>(null),
    [concept, setConcept] = useState(false);
  const dialog = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (entry) dialog.current?.focus();
  }, [entry]);
  function lookup(value: string) {
    setTerm(value);
    setEntry(localWordHelp.lookup(value, activity));
    onHelp();
  }
  return (
    <section className="word-help">
      <div className="actions">
        <button
          type="button"
          ref={trigger}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          Help
        </button>
        <button
          type="button"
          onClick={() => {
            setConcept(!concept);
            onHelp();
          }}
        >
          What does this instruction mean?
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const selection = window.getSelection();
            const node = selection?.anchorNode;
            const element =
              node?.nodeType === 1 ? (node as Element) : node?.parentElement;
            lookup(
              element?.closest("[data-german]")
                ? (selection?.toString().trim() ?? "")
                : "",
            );
          }}
        >
          Ask Frau Helga about this
        </button>
      </div>
      {concept && (
        <p className="notice">
          Meaning is the idea you communicate. A conjugated verb agrees with the
          subject (for example, wir lernen). Word order is the position of
          words. Case changes articles according to their role in a sentence. A
          destination says where you are going; a location says where you are.
        </p>
      )}
      {open && (
        <div>
          <p>
            Select a word in the German text and choose “Ask Frau Helga about
            this”, or look up a single word here. Help never submits an answer
            or reduces your score.
          </p>
          <label>
            German word lookup
            <input
              lang="de-DE"
              spellCheck={settings.germanSpellcheck}
              value={term}
              maxLength={40}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  lookup(term);
                }
              }}
            />
          </label>
          <button type="button" onClick={() => lookup(term)}>
            Look up word
          </button>
        </div>
      )}
      {entry && (
        <div
          ref={dialog}
          tabIndex={-1}
          role="dialog"
          aria-label="Frau Helga word help"
          className="word-popup"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setEntry(null);
              trigger.current?.focus();
            }
          }}
        >
          <button
            type="button"
            onClick={() => {
              setEntry(null);
              trigger.current?.focus();
            }}
          >
            Close word help
          </button>
          {typeof entry === "string" ? (
            <p>{entry}</p>
          ) : (
            <>
              <h4 lang="de">{entry.term}</h4>
              <p>{entry.meaning}</p>
              <p>{entry.grammar}</p>
              <p lang="de">{entry.example}</p>
              <VoiceControls text={entry.term} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
