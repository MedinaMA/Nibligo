// Free-tier lessons. One curriculum, written in English, translated into each target
// language by Claude ONCE (first request), then cached forever and served free to everyone.
import { askClaude } from "./tutor.js";
import { db } from "./store.js";
import { HttpError } from "./http.js";

export const CURRICULUM = [
  { title: "Hello!", emoji: "👋", color: "grape",
    words: ["hello", "goodbye", "please", "thank you", "yes", "no", "good morning", "good night"],
    phrases: ["Hello, how are you?", "I'm fine, thank you.", "Nice to meet you.", "See you tomorrow!", "Excuse me.", "I'm sorry.", "Have a nice day!", "And you?"] },
  { title: "About me", emoji: "🙋", color: "coral",
    words: ["name", "friend", "student", "country", "city", "language", "teacher", "house"],
    phrases: ["My name is Alex.", "What's your name?", "I'm from Canada.", "Where are you from?", "I live in a big city.", "I speak a little.", "I'm learning this language.", "Can you speak slowly, please?"] },
  { title: "At the café", emoji: "☕", color: "sun",
    words: ["coffee", "water", "tea", "bread", "cheese", "menu", "the bill", "delicious"],
    phrases: ["A coffee, please.", "I would like a water.", "How much is it?", "The menu, please.", "This is delicious!", "The bill, please.", "I'm hungry.", "Do you have tea?"] },
  { title: "Shopping", emoji: "🛍️", color: "mint",
    words: ["one", "two", "three", "ten", "money", "shop", "cheap", "expensive"],
    phrases: ["How much does this cost?", "It's too expensive.", "I'll take two.", "Do you accept cards?", "I'm just looking.", "Do you have a smaller size?", "Where is the market?", "That's cheap!"] },
  { title: "Getting around", emoji: "🧭", color: "sky",
    words: ["left", "right", "street", "station", "bus", "train", "ticket", "near"],
    phrases: ["Where is the station?", "Turn left.", "It's on the right.", "Is it far?", "A ticket to the city center, please.", "When does the bus leave?", "I'm lost.", "Go straight ahead."] },
  { title: "My day", emoji: "⏰", color: "grape",
    words: ["today", "tomorrow", "morning", "evening", "work", "home", "to sleep", "to eat"],
    phrases: ["What time is it?", "I wake up at seven.", "I go to work by bus.", "I'm tired today.", "I eat dinner at home.", "What are you doing tomorrow?", "I have a meeting in the morning.", "I go to bed late."] },
  { title: "Family & friends", emoji: "👨‍👩‍👧", color: "coral",
    words: ["mother", "father", "sister", "brother", "child", "family", "dog", "birthday"],
    phrases: ["I have a brother and a sister.", "This is my mother.", "Do you have children?", "My family is big.", "I have a dog.", "Happy birthday!", "My best friend lives nearby.", "We eat together on Sundays."] },
  { title: "Feelings", emoji: "💭", color: "mint",
    words: ["happy", "sad", "to love", "to like", "beautiful", "interesting", "boring", "because"],
    phrases: ["I'm very happy!", "I love this song.", "I don't like the rain.", "What do you think?", "I think it's interesting.", "It's a beautiful day.", "That's boring.", "I like it because it's fun."] },
];

const str = { type: "string" };
const obj = (properties) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const arr = (items) => ({ type: "array", items });

const unitSchema = obj({
  words: arr(obj({
    en: { ...str, description: "The English word exactly as given." },
    target: { ...str, description: "The word in the target language." },
    roman: { ...str, description: "Romanization if the target script is not Latin, otherwise an empty string." },
  })),
  phrases: arr(obj({
    en: { ...str, description: "The English phrase exactly as given." },
    target: { ...str, description: "Natural, everyday spoken translation." },
    roman: { ...str, description: "Romanization if the target script is not Latin, otherwise an empty string." },
    tokens: arr({ ...str, description: "Word-bank tile." }),
    distractors: arr({ ...str, description: "A plausible wrong tile in the target language." }),
  })),
});

async function translateUnit(language, unit) {
  const system = `You are an expert ${language} teacher writing beginner lessons for English speakers.
Translate each item into natural, everyday spoken ${language} (the variety named, e.g. Latin American vs European). Use the most common, friendly register a traveller would actually hear. For verbs given as "to X", use the dictionary form.
- "roman": standard romanization when the script is not Latin (pinyin with tone marks, Hepburn romaji, Revised Romanization of Korean, ISO-style for others); empty string for Latin-script languages.
- "tokens" (phrases only): split "target" into 2–8 word-bank tiles in order. Joined with single spaces (or with nothing, for languages written without spaces such as Japanese, Chinese and Thai) they must reproduce "target" exactly. Keep punctuation attached to the neighbouring tile.
- "distractors": exactly 2 plausible wrong tiles in ${language}.
Return every item, in the same order as given.`;
  const content = `Words:\n${unit.words.map((w, i) => `${i + 1}. ${w}`).join("\n")}\n\nPhrases:\n${unit.phrases.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
  const out = await askClaude({ system, messages: [{ role: "user", content }], schema: unitSchema, effort: "medium" });
  if (out.words?.length !== unit.words.length || out.phrases?.length !== unit.phrases.length) throw new Error("Lesson generation returned the wrong number of items.");
  for (const p of out.phrases) {
    if (!p.tokens?.length) p.tokens = p.target.split(/\s+/);
    p.distractors = (p.distractors || []).filter((d) => d && !p.tokens.includes(d)).slice(0, 2);
  }
  return {
    title: unit.title, emoji: unit.emoji, color: unit.color,
    words: out.words.map((w, i) => ({ en: unit.words[i], target: w.target.trim(), roman: w.roman.trim() })),
    phrases: out.phrases.map((p, i) => ({ en: unit.phrases[i], target: p.target.trim(), roman: p.roman.trim(), tokens: p.tokens, distractors: p.distractors })),
  };
}

const VERSION = "v1";
const key = (language) => `lessons:${VERSION}:${language}`;

/** Returns { status: "ready", units } or { status: "preparing" } while generation runs. */
export async function getLessons(language, allowed) {
  if (!allowed.includes(language)) throw new HttpError(400, "Unknown language.");
  const cached = await db().get(key(language));
  if (cached) return { status: "ready", units: cached };

  // Only one generation per language at a time.
  const gotLock = await db().set(`lock:${key(language)}`, 1, { nx: true, ex: 240 });
  if (!gotLock) return { status: "preparing" };
  try {
    const units = await Promise.all(CURRICULUM.map((u) => translateUnit(language, u)));
    await db().set(key(language), units);
    return { status: "ready", units };
  } finally {
    await db().del(`lock:${key(language)}`);
  }
}
