import { createHash } from "node:crypto";
import {
  mkdirSync,
  existsSync,
  lstatSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import {
  originalVoiceTexts,
  normalizeVoiceText,
  VOICE_LIMITS,
} from "../shared/voice-contract.js";
const digest = (s: string | Uint8Array) =>
  createHash("sha256").update(s).digest("hex");
export interface SavedAudio {
  namespace: string;
  get(text: string): Uint8Array | undefined;
  put(text: string, audio: Uint8Array): void;
  info(): { count: number; bytes: number; texts: string[] };
  clear(): void;
}
// This is a new, exclusively managed directory. Existing audio/recordings are
// never imported, rewritten or removed implicitly. Namespace binds voice+model.
export class FileSavedAudio implements SavedAudio {
  readonly namespace: string;
  private directory: string;
  constructor(
    root: string,
    voice: string,
    model: string,
    private reuseAllowed = false,
  ) {
    this.namespace = digest(`frau-helga-cache-v1\0${voice}\0${model}`);
    mkdirSync(root, { recursive: true });
    if (lstatSync(root).isSymbolicLink()) throw Error("Unsafe cache directory");
    this.directory = join(root, this.namespace);
    mkdirSync(this.directory, { recursive: true });
    if (lstatSync(this.directory).isSymbolicLink())
      throw Error("Unsafe cache directory");
  }
  private path(text: string) {
    const normalized = normalizeVoiceText(text);
    if (!originalVoiceTexts.has(normalized))
      throw Error("Only original prompts may be saved");
    return join(this.directory, `${digest(normalized)}.clip.json`);
  }
  get(text: string) {
    if (!this.reuseAllowed) return undefined;
    const path = this.path(text);
    if (!existsSync(path)) return undefined;
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 3_000_000)
      throw Error("Invalid saved audio");
    const record = JSON.parse(readFileSync(path, "utf8"));
    if (
      record.version !== 1 ||
      record.permitted !== true ||
      record.namespace !== this.namespace ||
      typeof record.audio !== "string"
    )
      throw Error("Invalid saved audio");
    const audio = Buffer.from(record.audio, "base64");
    if (
      !audio.length ||
      audio.length > VOICE_LIMITS.audioBytes ||
      digest(audio) !== record.sha256
    )
      throw Error("Invalid saved audio");
    return audio;
  }
  put(text: string, audio: Uint8Array) {
    if (!this.reuseAllowed) return;
    const path = this.path(text);
    if (existsSync(path)) {
      this.get(text);
      return;
    } // Never overwrite existing data.
    if (
      !audio.length ||
      audio.length > VOICE_LIMITS.audioBytes ||
      this.info().bytes + audio.length > 50_000_000
    )
      throw Error("Saved audio limit");
    writeFileSync(
      path,
      JSON.stringify({
        version: 1,
        permitted: true,
        namespace: this.namespace,
        sha256: digest(audio),
        audio: Buffer.from(audio).toString("base64"),
      }),
      { flag: "wx", mode: 0o600 },
    );
  }
  info() {
    const texts: string[] = [];
    let bytes = 0;
    if (this.reuseAllowed)
      for (const text of originalVoiceTexts) {
        const audio = this.get(text);
        if (audio) {
          texts.push(text);
          bytes += audio.length;
        }
      }
    return { count: texts.length, bytes, texts };
  }
  clear() {
    // Only valid records of this format/voice are eligible. Unknown, corrupt,
    // unrelated and user-created files are preserved for manual review.
    const allowed = new Set(
      [...originalVoiceTexts]
        .filter((text) => !!this.get(text))
        .map((text) => this.path(text)),
    );
    for (const file of readdirSync(this.directory)) {
      const path = join(this.directory, file);
      if (allowed.has(path)) unlinkSync(path);
    }
  }
}
