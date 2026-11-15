// Tutor logic shared by the local server (server.js) and Vercel functions (api/*.js).
import Anthropic from "@anthropic-ai/sdk";
import { HttpError } from "./http.js";
const MODEL = "claude-opus-5-5";

let anthropic;
const client = () => (anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() || undefined })); // reads ANTHROPIC_API_KEY (or an `ant auth login` profile)

// ---------------------------------------------------------------------------
// Claude helper: one structured-JSON call with server-side refusal fallback.
// ---------------------------------------------------------------------------
export async function askClaude({ system, messages, schema, effort = "low" }) {
  const response = await client().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    cache_control: { type: "ephemeral" }, // caches the system prompt + history between turns
    output_config: { effort, format: { type: "json_schema", schema } },
    system,
    messages,
  });

  if (response.stop_reason === "refusal") {
    throw new HttpError(422, "The tutor couldn't respond to that. Try rephrasing.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new HttpError(502, "The tutor's reply was cut off. Please try again.");
  }
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  return JSON.parse(text);
}

const str = { type: "string" };
const obj = (properties) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const arr = (items) => ({ type: "array", items });

function describeLearner(p) {
  return [
    `Target language: ${p.target}`,
    `Learner's native language: ${p.native}`,
    `Current level: ${p.level}`,
    p.interests ? `Interests: ${p.interests}` : null,
    p.notes ? `What you know about this learner from past sessions:\n${String(p.notes).slice(0, 2000)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// /api/chat — one conversational turn with the tutor.
// ---------------------------------------------------------------------------
const chatSchema = obj({
  reply: { ...str, description: "Your spoken reply, in the target language only." },
  reply_translation: { ...str, description: "Translation of reply into the learner's native language." },
  corrections: arr(
    obj({
      original: { ...str, description: "What the learner said (the erroneous fragment)." },
      corrected: { ...str, description: "The natural, correct version in the target language." },
      explanation: { ...str, description: "Short explanation in the learner's native language." },
    }),
  ),
  vocabulary: arr(
    obj({
      phrase: { ...str, description: "Useful word or phrase from your reply, in the target language." },
      meaning: { ...str, description: "Meaning in the learner's native language." },
    }),
  ),
  suggestions: arr({ ...str, description: "A natural thing the learner could say next, in the target language." }),
});

const TUTOR_RULES = `You are a warm, encouraging spoken-language tutor. The learner practices by speaking out loud; their words reach you through speech recognition, and your reply is read aloud by text-to-speech.

How to teach for real fluency:
- Maximize the learner's speaking time. Keep replies short: 1–3 sentences, conversational, and almost always end with a question or prompt that invites them to keep talking.
- Speak ONLY the target language in "reply". Pitch it just above the learner's level: mostly words they know, plus one or two new useful ones. For beginners, use very short, simple sentences.
- Stay in the scenario and keep the conversation genuinely interesting. Connect to their interests and to things they told you earlier.
- Because the reply is spoken aloud, write it as natural speech: no emoji, lists, markdown, or parenthetical asides.
- Recast naturally: when the learner makes a mistake, use the correct form in your own reply without making a fuss.
- In "corrections", list at most 3 mistakes that actually matter (grammar, wrong word, unnatural phrasing). Skip trivial ones. Ignore punctuation and capitalization; those come from speech recognition. If a word looks like a mis-recognition of a similar-sounding word, it may be a pronunciation slip: note it as such. If they spoke well, return an empty list.
- If the learner uses their native language or says they don't know how to say something, help them: give them the phrase in the target language in "corrections" and encourage them to say it.
- "vocabulary": 0–3 useful items from your reply that are likely new to this learner.
- "suggestions": exactly 2 short, natural responses the learner could say next, at their level.`;

export async function handleChat(body) {
  const { profile, scenario, history } = body;
  if (!profile?.target || !Array.isArray(history)) throw new HttpError(400, "Missing profile or history.");

  const system = `${TUTOR_RULES}

${describeLearner(profile)}

Scenario: ${scenario || "Free conversation. Get to know the learner and talk about whatever interests them."}`;

  // The browser sends [{role, text}]; the first turn may be empty so the tutor opens.
  const messages = history
    .slice(-40)
    .filter((m) => m.text?.trim())
    .map((m) => ({ role: m.role === "tutor" ? "assistant" : "user", content: String(m.text).slice(0, 2000) }));
  if (messages.length === 0 || messages[0].role !== "user") {
    messages.unshift({ role: "user", content: "(The learner has just arrived. Open the conversation for this scenario.)" });
  }
  if (messages.at(-1).role !== "user") {
    messages.push({ role: "user", content: "(The learner is quiet. Gently prompt them to say something.)" });
  }
  return askClaude({ system, messages, schema: chatSchema, effort: "low" });
}

// ---------------------------------------------------------------------------
// /api/grade — check a spoken answer in a review drill.
// ---------------------------------------------------------------------------
const gradeSchema = obj({
  score: { type: "integer", description: "0 = wrong/missing, 1 = understandable but flawed, 2 = correct and natural." },
  feedback: { ...str, description: "One or two encouraging sentences in the learner's native language." },
  model_answer: { ...str, description: "The best natural way to say it in the target language." },
});

export async function handleGrade(body) {
  const { profile, prompt, expected, said } = body;
  if (!profile?.target || !prompt) throw new HttpError(400, "Missing drill details.");
  const system = `You grade short spoken answers in a ${profile.target} speaking drill for a ${profile.level} learner whose native language is ${profile.native}. The answer came from speech recognition, so ignore punctuation, capitalization and spelling quirks of homophones. Accept any natural, correct way to express the meaning, not only the reference answer.`;
  const content = `Prompt shown to the learner: ${prompt}
Reference answer: ${expected}
What the learner said: ${said || "(nothing)"}`;
  return askClaude({ system, messages: [{ role: "user", content }], schema: gradeSchema, effort: "low" });
}

// ---------------------------------------------------------------------------
// /api/summary — end-of-session feedback and long-term learner notes.
// ---------------------------------------------------------------------------
const summarySchema = obj({
  feedback: { ...str, description: "3–5 sentences of session feedback in the learner's native language: what went well, what to work on." },
  level_estimate: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
  focus_areas: arr({ ...str, description: "A specific thing to practice next, in the native language." }),
  notes: { ...str, description: "Updated private tutor notes about this learner (max ~150 words): recurring mistakes, known vocabulary, topics they like, personal details they shared. Merge with the previous notes." },
});

export async function handleSummary(body) {
  const { profile, history } = body;
  if (!profile?.target || !Array.isArray(history)) throw new HttpError(400, "Missing profile or history.");
  const transcript = history
    .filter((m) => m.text?.trim())
    .map((m) => `${m.role === "tutor" ? "Tutor" : "Learner"}: ${m.text}`)
    .join("\n");
  const system = `You are an experienced ${profile.target} teacher reviewing a spoken practice session. Judge the learner by what they actually said (via speech recognition; ignore punctuation).\n\n${describeLearner(profile)}`;
  return askClaude({
    system,
    messages: [{ role: "user", content: `Session transcript:\n${transcript || "(empty)"}` }],
    schema: summarySchema,
    effort: "medium",
  });
}

export const tasks = { chat: handleChat, grade: handleGrade, summary: handleSummary };
