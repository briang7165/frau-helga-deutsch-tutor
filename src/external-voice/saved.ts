import {
  normalizeVoiceText,
  originalVoiceTexts,
  VOICE_LIMITS,
} from "../../shared/voice-contract";
export type SavedClip = {
  key: string;
  text: string;
  namespace: string;
  audio: Blob;
};
export interface ClipStore {
  get(text: string): Promise<SavedClip | undefined>;
  put(text: string, namespace: string, audio: Blob): Promise<void>;
  select(namespace: string): Promise<void>;
  info(): Promise<{ count: number; bytes: number }>;
  clear(): Promise<void>;
}
const valid = (clip: SavedClip) =>
  originalVoiceTexts.has(clip.text) &&
  clip.audio instanceof Blob &&
  clip.audio.size > 0 &&
  clip.audio.size <= VOICE_LIMITS.audioBytes &&
  clip.audio.type === "audio/mpeg";
export class BrowserClipStore implements ClipStore {
  private async run<T>(
    mode: IDBTransactionMode,
    action: (tx: IDBTransaction, done: (value: T) => void) => void,
  ): Promise<T> {
    if (typeof indexedDB === "undefined")
      throw Error("Browser audio storage unavailable");
    return new Promise<T>((resolve, reject) => {
      const open = indexedDB.open("frau-helga-saved-voice-v1", 1);
      open.onupgradeneeded = () => {
        open.result.createObjectStore("clips", { keyPath: "key" });
        open.result.createObjectStore("meta");
      };
      open.onerror = () => reject(Error("Browser audio storage unavailable"));
      open.onblocked = () => reject(Error("Browser audio storage blocked"));
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction(["clips", "meta"], mode);
        let result: T;
        tx.oncomplete = () => {
          db.close();
          if (mode === "readwrite" && typeof window !== "undefined")
            window.dispatchEvent(new Event("frau-helga-cache-changed"));
          resolve(result);
        };
        tx.onerror = tx.onabort = () => {
          db.close();
          reject(Error("Browser audio storage unavailable or full"));
        };
        try {
          action(tx, (value) => {
            result = value;
          });
        } catch {
          tx.abort();
        }
      };
    });
  }
  async get(text: string) {
    return this.run<SavedClip | undefined>("readonly", (tx, done) => {
      const meta = tx.objectStore("meta").get("selected");
      meta.onsuccess = () => {
        const req = tx
          .objectStore("clips")
          .get(`${meta.result}|${normalizeVoiceText(text)}`);
        req.onsuccess = () =>
          done(req.result && valid(req.result) ? req.result : undefined);
      };
    });
  }
  async select(namespace: string) {
    if (!/^[a-f0-9]{64}$/.test(namespace))
      throw Error("Saved library identity unavailable");
    return this.run<void>("readwrite", (tx, done) => {
      tx.objectStore("meta").put(namespace, "selected");
      done();
    });
  }
  async put(text: string, namespace: string, audio: Blob) {
    text = normalizeVoiceText(text);
    const clip = { key: `${namespace}|${text}`, text, namespace, audio };
    if (!/^[a-f0-9]{64}$/.test(namespace) || !valid(clip))
      throw Error("Only original permitted clips may be saved");
    return this.run<void>("readwrite", (tx, done) => {
      const clips = tx.objectStore("clips"),
        all = clips.getAll();
      all.onsuccess = () => {
        const records = all.result as SavedClip[];
        if (records.some((c) => c.key === clip.key)) {
          done();
          return;
        }
        if (
          records.length >= 64 ||
          records.reduce((n, c) => n + c.audio.size, 0) + audio.size >
            50_000_000
        ) {
          tx.abort();
          return;
        }
        clips.add(clip);
        tx.objectStore("meta").put(namespace, "selected");
        done();
      };
    });
  }
  async info() {
    return this.run<{ count: number; bytes: number }>(
      "readonly",
      (tx, done) => {
        const r = tx.objectStore("clips").getAll();
        r.onsuccess = () => {
          const clips = (r.result as SavedClip[]).filter(valid);
          done({
            count: clips.length,
            bytes: clips.reduce((n, c) => n + c.audio.size, 0),
          });
        };
      },
    );
  }
  async clear() {
    return this.run<void>("readwrite", (tx, done) => {
      tx.objectStore("clips").clear();
      tx.objectStore("meta").clear();
      done();
    });
  }
}
export const savedClips = new BrowserClipStore();
