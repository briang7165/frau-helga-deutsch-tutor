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
