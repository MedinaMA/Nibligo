// GET /api/lessons?lang=French: free-tier lesson content (public; generated once per language, then cached).
import { route, json, HttpError } from "../lib/http.js";
import { getLessons } from "../lib/lessons.js";

const LANGUAGES = [
  "Arabic", "Bengali", "Cantonese", "Catalan", "Chinese (Mandarin)", "Croatian", "Czech", "Danish", "Dutch",
  "English (US)", "English (UK)", "Filipino", "Finnish", "French", "German", "Greek", "Hebrew", "Hindi",
  "Hungarian", "Indonesian", "Italian", "Japanese", "Korean", "Malay", "Norwegian", "Persian", "Polish",
  "Portuguese (Brazil)", "Portuguese (Portugal)", "Romanian", "Russian", "Spanish (Spain)", "Spanish (Latin America)",
  "Swahili", "Swedish", "Tamil", "Thai", "Turkish", "Ukrainian", "Urdu", "Vietnamese",
];

export const GET = route(async (request) => {
  const lang = new URL(request.url).searchParams.get("lang") || "";
  if (!lang) throw new HttpError(400, "Missing lang.");
  const result = await getLessons(lang, LANGUAGES);
  return json(result, result.status === "ready" ? 200 : 202, result.status === "ready" ? { "Cache-Control": "public, max-age=3600, s-maxage=86400" } : {});
});
