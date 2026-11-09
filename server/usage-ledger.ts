import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { VOICE_LIMITS } from "../shared/voice-contract.js";
import { VoiceError, type UsageLedger } from "./voice-core.js";
type Counts = {
  day: string;
  dayChars: number;
  month: string;
  monthChars: number;
};
export class FileUsageLedger implements UsageLedger {
  constructor(private path: string) {}
  reserve(characters: number, now: Date) {
    const day = now.toISOString().slice(0, 10),
      month = day.slice(0, 7);
    let counts: Counts = { day, dayChars: 0, month, monthChars: 0 };
    try {
      if (existsSync(this.path)) {
        const old = JSON.parse(readFileSync(this.path, "utf8")) as Counts;
        if (
          !/^\d{4}-\d\d-\d\d$/.test(old.day) ||
          !/^\d{4}-\d\d$/.test(old.month) ||
          !Number.isSafeInteger(old.dayChars) ||
          old.dayChars < 0 ||
          !Number.isSafeInteger(old.monthChars) ||
          old.monthChars < 0 ||
          old.day > day ||
          old.month > month
        )
          throw Error("Invalid ledger");
        counts = {
          day,
          month,
          dayChars: old.day === day ? old.dayChars : 0,
          monthChars: old.month === month ? old.monthChars : 0,
        };
      }
      if (
        counts.dayChars + characters > VOICE_LIMITS.day ||
        counts.monthChars + characters > VOICE_LIMITS.month
      )
        throw new VoiceError("quota", 429);
      counts.dayChars += characters;
      counts.monthChars += characters;
      writeFileSync(this.path + ".tmp", JSON.stringify(counts), {
        mode: 0o600,
      });
      renameSync(this.path + ".tmp", this.path);
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      throw new VoiceError("configuration", 503);
    }
  }
}
