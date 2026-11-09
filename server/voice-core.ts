import {
  VOICE_LIMITS as limits,
  normalizeVoiceText,
  originalVoiceTexts,
  type VoiceErrorCode,
} from "../shared/voice-contract.js";
export const MODEL = "eleven_multilingual_v2";
export class VoiceError extends Error {
  constructor(
    public code: VoiceErrorCode,
    public status = 400,
  ) {
    super(code);
  }
}
export type VoiceConfig = { enabled: boolean; apiKey: string; voiceId: string };
export interface UsageLedger {
  reserve(characters: number, now: Date): void;
}
type Fetcher = typeof fetch;
async function readBounded(
  response: Response,
  maximum: number,
): Promise<Uint8Array> {
  if (!response.body) throw new VoiceError("unavailable", 502);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maximum) {
        await reader.cancel();
        throw new VoiceError("unavailable", 502);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
function checkStatus(r: Response) {
  if (r.ok) return;
  if (r.status === 401 || r.status === 403)
    throw new VoiceError("authorization", 502);
  if (r.status === 404 || r.status === 422)
    throw new VoiceError("unsupported_voice", 502);
  if (r.status === 429) throw new VoiceError("quota", 429);
  throw new VoiceError("unavailable", 502);
}
export function validateVoiceRequest(raw: unknown): string {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new VoiceError("invalid_request");
  const r = raw as Record<string, unknown>;
  if (
    Object.keys(r).some((k) => !["text", "consent"].includes(k)) ||
    typeof r.text !== "string"
  )
    throw new VoiceError("invalid_request");
  if (r.consent !== true) throw new VoiceError("consent_required", 403);
  if (r.text.length > limits.request || /[\u0000-\u001f\u007f]/u.test(r.text))
    throw new VoiceError("invalid_request");
  const text = normalizeVoiceText(r.text);
  if (!text || !originalVoiceTexts.has(text))
    throw new VoiceError("unsupported_text");
  return text;
}
export class VoiceService {
  private used = 0;
  private busy = false;
  private times: number[] = [];
  private cache = new Map<string, Uint8Array>();
  constructor(
    private config: VoiceConfig,
    private ledger: UsageLedger,
    private upstream: Fetcher = fetch,
    private now: () => Date = () => new Date(),
  ) {}
  status() {
    return {
      enabled: this.config.enabled,
      configured:
        !!this.config.apiKey &&
        /^[A-Za-z0-9]{10,80}$/.test(this.config.voiceId),
      sessionUsed: this.used,
      limits,
    };
  }
  private async json(path: string, signal: AbortSignal): Promise<any> {
    const r = await this.upstream(`https://api.elevenlabs.io/v1/${path}`, {
      headers: { "xi-api-key": this.config.apiKey },
      signal,
      redirect: "error",
    });
    checkStatus(r);
    return JSON.parse(
      new TextDecoder().decode(await readBounded(r, 1_000_000)),
    );
  }
  async speak(raw: unknown): Promise<{ audio: Uint8Array; cached: boolean }> {
    const text = validateVoiceRequest(raw);
    if (!this.config.enabled) throw new VoiceError("disabled", 403);
    if (!this.status().configured) throw new VoiceError("configuration", 503);
    const time = this.now().getTime();
    this.times = this.times.filter((t) => time - t < 60000);
    if (this.times.length >= limits.perMinute)
      throw new VoiceError("rate_limit", 429);
    this.times.push(time);
    const cached = this.cache.get(text);
    if (cached) return { audio: cached, cached: true };
    if (this.busy) throw new VoiceError("busy", 429);
    if (this.used + text.length > limits.session)
      throw new VoiceError("quota", 429);
    this.busy = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), limits.timeoutMs);
    try {
      // Read-only preflight happens only after an explicit, consented speak request.
      const subscription = await this.json(
        "user/subscription",
        controller.signal,
      );
      if (
        subscription.tier !== "free" ||
        subscription.can_extend_character_limit !== false ||
        // Current field is mandatory: never infer a disabled billing cap from
        // deprecated fields. Null/omitted legacy values are normal, but an
        // explicit contradictory or malformed legacy value still fails closed.
        subscription.max_credit_limit_extension !== 0 ||
        (subscription.allowed_to_extend_character_limit != null &&
          subscription.allowed_to_extend_character_limit !== false) ||
        (subscription.max_character_limit_extension != null &&
          subscription.max_character_limit_extension !== 0) ||
        subscription.has_open_invoices !== false ||
        !Number.isSafeInteger(subscription.character_count) ||
        subscription.character_count < 0 ||
        !Number.isSafeInteger(subscription.character_limit) ||
        subscription.character_limit <= 0 ||
        !(
          (typeof subscription.current_overage?.amount === "string" &&
            /^0(?:\.0+)?$/.test(subscription.current_overage.amount)) ||
          subscription.current_overage?.amount === 0
        )
      )
        throw new VoiceError("quota", 403);
      const models = await this.json("models", controller.signal);
      const model = Array.isArray(models)
        ? models.find((m) => m.model_id === MODEL)
        : null;
      if (
        !model ||
        model.can_do_text_to_speech !== true ||
        !model.languages?.some(
          (l: { language_id: string }) => l.language_id === "de",
        ) ||
        model.requires_alpha_access === true
      )
        throw new VoiceError("unsupported_voice", 403);
      const multiplier = model.model_rates?.character_cost_multiplier;
      if (
        typeof multiplier !== "number" ||
        !Number.isFinite(multiplier) ||
        multiplier <= 0 ||
        multiplier > 1 ||
        subscription.character_limit - subscription.character_count <
          Math.ceil(text.length * multiplier) + 100
      )
        throw new VoiceError("quota", 403);
      const voice = await this.json(
        `voices/${encodeURIComponent(this.config.voiceId)}`,
        controller.signal,
      );
      if (
        voice.voice_id !== this.config.voiceId ||
        (Array.isArray(voice.available_for_tiers) &&
          voice.available_for_tiers.length &&
          !voice.available_for_tiers.includes("free")) ||
        (voice.fine_tuning?.state?.[MODEL] &&
          voice.fine_tuning.state[MODEL] !== "fine_tuned")
      )
        throw new VoiceError("unsupported_voice", 403);
      // Reserve before synthesis, including uncertain/failed attempts. Never refund automatically.
      this.ledger.reserve(text.length, this.now());
      this.used += text.length;
      const response = await this.upstream(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(this.config.voiceId)}/stream?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": this.config.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text, model_id: MODEL }),
          signal: controller.signal,
          redirect: "error",
        },
      );
      checkStatus(response);
      if (!response.headers.get("content-type")?.startsWith("audio/"))
        throw new VoiceError("unavailable", 502);
      const audio = await readBounded(response, limits.audioBytes);
      if (!audio.length) throw new VoiceError("unavailable", 502);
      if (this.cache.size >= limits.cacheEntries)
        this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(text, audio);
      return { audio, cached: false };
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      throw new VoiceError(
        controller.signal.aborted ? "timeout" : "unavailable",
        502,
      );
    } finally {
      clearTimeout(timeout);
      this.busy = false;
    }
  }
  clearCache() {
    this.cache.clear();
  }
}
