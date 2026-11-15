// Builds public/lessons/<slug>.json from the hand-written files in lessons-src/.
// Run: npm run lessons
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CURRICULUM } from "../lib/lessons.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "lessons-src");
const outDir = path.join(root, "public", "lessons");
fs.mkdirSync(outDir, { recursive: true });

export const slugOf = (name) => name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
const NO_SPACES = /^(Japanese|Chinese|Cantonese|Thai)/;
const PER_UNIT = 8;
const index = [];
let failed = false;

for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith(".txt")).sort()) {
  const raw = fs.readFileSync(path.join(srcDir, file), "utf8");
  const lang = raw.match(/^lang:\s*(.+)$/m)?.[1].trim();
  const problems = [];
  const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#") && !l.startsWith("lang:"));
  const sep = lines.indexOf("---");
  const parse = (l) => { const [t, r = ""] = l.split(" // "); return { t: t.trim(), roman: r.trim() }; };
  const words = lines.slice(0, sep).map(parse);
  const phrases = lines.slice(sep + 1).map(parse);
  const nUnits = CURRICULUM.length;
  if (words.length !== nUnits * PER_UNIT) problems.push(`expected ${nUnits * PER_UNIT} words, got ${words.length}`);
  if (phrases.length !== nUnits * PER_UNIT) problems.push(`expected ${nUnits * PER_UNIT} phrases, got ${phrases.length}`);

  const noSpace = NO_SPACES.test(lang);
  const fixFrench = (s) => (lang === "French" ? s.replace(/ ([?!:;])/g, " $1") : s);
  const seen = new Map();
  for (const [i, w] of words.entries()) {
    const k = w.t.toLowerCase();
    if (seen.has(k)) problems.push(`duplicate word "${w.t}" (#${seen.get(k) + 1} and #${i + 1})`);
    seen.set(k, i);
  }

  const units = CURRICULUM.map((u, ui) => {
    const ws = words.slice(ui * PER_UNIT, ui * PER_UNIT + PER_UNIT);
    const ps = phrases.slice(ui * PER_UNIT, ui * PER_UNIT + PER_UNIT).map((p) => {
      const t = fixFrench(p.t);
      const tokens = t.includes("·") ? t.split("·") : t.split(" ");
      const target = t.replaceAll("·", noSpace ? "" : " ");
      if ((noSpace ? tokens.join("") : tokens.join(" ")) !== target) problems.push(`tiles don't rebuild "${target}"`);
      if (tokens.some((x) => !x.trim())) problems.push(`empty tile in "${target}"`);
      return { target, roman: p.roman, tokens };
    });
    return {
      title: u.title, emoji: u.emoji, color: u.color,
      words: u.words.map((en, i) => ({ en, target: ws[i]?.t || "", roman: ws[i]?.roman || "" })),
      phrases: u.phrases.map((en, i) => {
        const p = ps[i] || { target: "", roman: "", tokens: [] };
        // Distractor tiles: tiles from other phrases in the same unit.
        const pool = [...new Set(ps.filter((_, j) => j !== i).flatMap((q) => q.tokens))].filter((t) => !p.tokens.includes(t));
        const distractors = [];
        for (let j = 0; j < pool.length && distractors.length < 2; j += Math.max(1, Math.floor(pool.length / 2))) distractors.push(pool[(i * 3 + j) % pool.length]);
        return { en, target: p.target, roman: p.roman, tokens: p.tokens, distractors: [...new Set(distractors)] };
      }),
    };
  });

  if (problems.length) {
    failed = true;
    console.error(`✗ ${lang} (${file}):\n  - ${problems.join("\n  - ")}`);
    continue;
  }
  const slug = slugOf(lang);
  fs.writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify({ status: "ready", units }));
  index.push({ lang, slug });
  console.log(`✓ ${lang} → public/lessons/${slug}.json`);
}
fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(index.map((x) => x.lang)));
if (failed) process.exit(1);
