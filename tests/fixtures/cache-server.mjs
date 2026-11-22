// Test-only child process: all upstream responses are fabricated; never fetch.
import { createVoiceServer } from "../../build/voice/server/http-server.js";
import { VoiceService, MODEL } from "../../build/voice/server/voice-core.js";
import { FileSavedAudio } from "../../build/voice/server/saved-audio.js";
const cache = new FileSavedAudio(
  process.argv[2],
  "fictionalVoice123",
  MODEL,
  true,
);
const mock = async (url) => {
  if (url.endsWith("user/subscription"))
    return Response.json({
      tier: "free",
      can_extend_character_limit: false,
      max_credit_limit_extension: 0,
      has_open_invoices: false,
      current_overage: { amount: "0" },
      character_count: 0,
      character_limit: 10000,
    });
  if (url.endsWith("models"))
    return Response.json([
      {
        model_id: MODEL,
        can_do_text_to_speech: true,
        languages: [{ language_id: "de" }],
        model_rates: { character_cost_multiplier: 1 },
      },
    ]);
  if (url.includes("/voices/"))
    return Response.json({
      voice_id: "fictionalVoice123",
      available_for_tiers: ["free"],
    });
  process.send?.({ synthesis: true });
  return new Response(new Uint8Array([73, 68, 51]), {
    headers: { "Content-Type": "audio/mpeg" },
  });
};
const service = new VoiceService(
  {
    enabled: process.argv[3] !== "disabled",
    apiKey: "fictional",
    voiceId: "fictionalVoice123",
  },
  { reserve() {} },
  mock,
  undefined,
  cache,
);
const server = createVoiceServer(service, "http://127.0.0.1:4173");
server.listen(0, "127.0.0.1", () =>
  process.send?.({ port: server.address().port }),
);
process.on("message", () => server.close(() => process.exit(0)));
