// Sayso front end.
// Speech in: Web Speech API. Speech out: speechSynthesis. Tutor: /api/tutor (subscribers).
// Progress lives in localStorage and syncs to the server for signed-in users.

// ===========================================================================
// Data
// ===========================================================================
const LANGUAGES = [
  ["Arabic", "ar-SA", "🇸🇦"], ["Bengali", "bn-IN", "🇧🇩"], ["Cantonese", "zh-HK", "🇭🇰"], ["Catalan", "ca-ES", "🇦🇩"],
  ["Chinese (Mandarin)", "zh-CN", "🇨🇳"], ["Croatian", "hr-HR", "🇭🇷"], ["Czech", "cs-CZ", "🇨🇿"], ["Danish", "da-DK", "🇩🇰"],
  ["Dutch", "nl-NL", "🇳🇱"], ["English (US)", "en-US", "🇺🇸"], ["English (UK)", "en-GB", "🇬🇧"], ["Filipino", "fil-PH", "🇵🇭"],
  ["Finnish", "fi-FI", "🇫🇮"], ["French", "fr-FR", "🇫🇷"], ["German", "de-DE", "🇩🇪"], ["Greek", "el-GR", "🇬🇷"],
  ["Hebrew", "he-IL", "🇮🇱"], ["Hindi", "hi-IN", "🇮🇳"], ["Hungarian", "hu-HU", "🇭🇺"], ["Indonesian", "id-ID", "🇮🇩"],
  ["Italian", "it-IT", "🇮🇹"], ["Japanese", "ja-JP", "🇯🇵"], ["Korean", "ko-KR", "🇰🇷"], ["Malay", "ms-MY", "🇲🇾"],
  ["Norwegian", "nb-NO", "🇳🇴"], ["Persian", "fa-IR", "🇮🇷"], ["Polish", "pl-PL", "🇵🇱"], ["Portuguese (Brazil)", "pt-BR", "🇧🇷"],
  ["Portuguese (Portugal)", "pt-PT", "🇵🇹"], ["Romanian", "ro-RO", "🇷🇴"], ["Russian", "ru-RU", "🇷🇺"], ["Spanish (Spain)", "es-ES", "🇪🇸"],
  ["Spanish (Latin America)", "es-MX", "🇲🇽"], ["Swahili", "sw-KE", "🇰🇪"], ["Swedish", "sv-SE", "🇸🇪"], ["Tamil", "ta-IN", "🇮🇳"],
  ["Thai", "th-TH", "🇹🇭"], ["Turkish", "tr-TR", "🇹🇷"], ["Ukrainian", "uk-UA", "🇺🇦"], ["Urdu", "ur-PK", "🇵🇰"],
  ["Vietnamese", "vi-VN", "🇻🇳"],
];
const POPULAR = ["Spanish (Latin America)", "French", "Japanese", "German", "Korean", "Italian", "Chinese (Mandarin)", "Portuguese (Brazil)"];

const SCENARIOS = [
  ["💬", "Free talk", "grape", "Free conversation. Get to know the learner and talk about whatever interests them."],
  ["☕", "Café", "coral", "You are a barista at a busy café. The learner is a customer ordering."],
  ["👋", "New friend", "mint", "You just met the learner at a party. Make small talk and find things in common."],
  ["🧭", "Directions", "sky", "The learner is a tourist who is lost and asks you, a local, for directions."],
  ["🛒", "Market", "sun", "You run a market stall. The learner wants to buy food and haggle a little."],
  ["🏨", "Hotel", "grape", "You are a hotel receptionist. The learner is checking in and has a problem with the room."],
  ["🩺", "Doctor", "coral", "You are a doctor. The learner describes symptoms and asks questions."],
  ["📖", "Storytime", "mint", "Ask the learner to tell you a story about something that happened to them; ask follow-up questions about the details."],
  ["💼", "Job interview", "sky", "You interview the learner for a job they would like. Ask real interview questions."],
  ["🔥", "Hot takes", "sun", "Discuss a fun, non-divisive debate (like the best pizza topping or cats vs dogs). Ask for the learner's opinion and playfully push back."],
];

const LEVELS = [
  ["🐣", "Complete beginner (A0)", "I'm new to it"],
  ["🌱", "Beginner (A1)", "I know some words"],
  ["🌿", "Elementary (A2)", "I can have simple chats"],
  ["🌳", "Intermediate (B1)", "I can talk about many topics"],
  ["🚀", "Upper intermediate (B2)", "I'm pretty comfortable"],
  ["🦅", "Advanced (C1)", "I want to sound natural"],
];
const GOALS = [["😌", 30, "Casual", "~5 min a day"], ["🙂", 50, "Regular", "~10 min a day"], ["💪", 100, "Serious", "~20 min a day"], ["🔥", 150, "Intense", "~30 min a day"]];

const XP = { turn: 10, shadow: 5, review: 10, reviewOk: 5, finish: 20 };
const levelThreshold = (n) => 50 * n * (n - 1); // XP needed to reach level n

// ===========================================================================
// Mascot (inline SVG, a few moods)
// ===========================================================================
function mascot(mood = "happy") {
  const body = "M60 12c28.7 0 50 18.4 50 41.5S88.7 95 60 95c-5.6 0-11-.7-16-2.1L22 107l5.2-21.4C16.8 78 10 66.4 10 53.5 10 30.4 31.3 12 60 12z";
  const look = mood === "think" ? [-3, -4] : [2, 2];
  const big = mood === "wow" ? 1.15 : 1;
  const eyes = [44, 76].map((x) => `
    <ellipse cx="${x}" cy="50" rx="${11 * big}" ry="${13 * big}" fill="#fff"/>
    <circle cx="${x + look[0]}" cy="${50 + look[1]}" r="${6.5 * big}" fill="#2B2540"/>
    <circle cx="${x + look[0] + 3}" cy="${50 + look[1] - 3.5}" r="2.4" fill="#fff"/>
    ${mood === "wow" ? `<circle cx="${x + look[0] - 2.5}" cy="${50 + look[1] + 2.5}" r="1.2" fill="#fff"/>` : ""}`).join("");
  const mouths = {
    happy: `<path d="M49 66q11 10 22 0" fill="none" stroke="#2B2540" stroke-width="4" stroke-linecap="round"/>`,
    talk: `<path d="M50 66q10 12 20 0z" fill="#2B2540" stroke="#2B2540" stroke-width="3" stroke-linejoin="round"/><path d="M55 71.5q5 3.5 10 0" fill="#FF5E7E"/>`,
    wow: `<path d="M47 65q13 18 26 0z" fill="#2B2540" stroke="#2B2540" stroke-width="3" stroke-linejoin="round"/><path d="M53 72q7 5 14 0" fill="#FF5E7E"/>`,
    think: `<path d="M53 69q6-3 13 0" fill="none" stroke="#2B2540" stroke-width="4" stroke-linecap="round"/>`,
  };
  const extras = mood === "think"
    ? `<text x="96" y="26" font-family="Nunito,sans-serif" font-weight="900" font-size="26" fill="#FFC83D">?</text>`
    : `<path d="M103 8l3.2 7.3 7.3 3.2-7.3 3.2-3.2 7.3-3.2-7.3-7.3-3.2 7.3-3.2z" fill="#FFC83D"/>${mood === "wow" ? `<path d="M14 18l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2z" fill="#3DB8FF"/>` : ""}`;
  return `<svg viewBox="0 0 120 120" aria-hidden="true">
    <path d="${body}" fill="#7B4DFF" stroke="#5A2FE0" stroke-width="4" stroke-linejoin="round"/>
    <ellipse cx="38" cy="28" rx="12" ry="6" fill="#fff" opacity=".25" transform="rotate(-20 38 28)"/>
    <g class="mascot-eyes">${eyes}</g>
    <ellipse cx="33" cy="67" rx="6" ry="4" fill="#FF8FB1" opacity=".9"/><ellipse cx="87" cy="67" rx="6" ry="4" fill="#FF8FB1" opacity=".9"/>
    ${mouths[mood] || mouths.happy}${extras}</svg>`;
}
function paintMascots(root = document) {
  root.querySelectorAll(".mascot-slot").forEach((s) => {
    if (s.dataset.painted !== s.dataset.mood) {
      s.innerHTML = mascot(s.dataset.mood);
      s.dataset.painted = s.dataset.mood;
    }
  });
}

// ===========================================================================
// Helpers
// ===========================================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const c of children) if (c != null) node.append(c);
  return node;
};
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => dayKey();
const lang = (name = state.profile?.target) => LANGUAGES.find(([n]) => n === name) || LANGUAGES[9];
const langName = () => state.profile.target;
const langCode = () => lang()[1];

let toastTimer;
function toast(msg, ms = 3800) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), ms);
}

function showView(id) {
  for (const v of ["landing", "paywall", "onboarding", "app", "loading", "lesson", "lesson-done"]) $(`#${v}`).hidden = v !== id;
  paintMascots();
  window.scrollTo(0, 0);
}

// ===========================================================================
// Sounds (tiny WebAudio synth, no files)
// ===========================================================================
let audioCtx;
function tone(freq, start, dur, type = "sine", vol = 0.18, slideTo) {
  audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
  const t0 = audioCtx.currentTime + start;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(audioCtx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}
const sfx = {
  pop: () => tone(520, 0, 0.09, "sine", 0.14, 880),
  ding: () => { tone(880, 0, 0.16, "triangle"); tone(1320, 0.1, 0.28, "triangle"); },
  oops: () => { tone(330, 0, 0.14, "triangle", 0.14); tone(247, 0.12, 0.22, "triangle", 0.14); },
  fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, i === 3 ? 0.5 : 0.16, "triangle", 0.16)),
};
function play(name) {
  if (!state?.settings?.sound) return;
  try { sfx[name](); } catch {}
}

// ===========================================================================
// Confetti
// ===========================================================================
function confetti(amount = 140) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = $("#confetti");
  const ctx = c.getContext("2d");
  const dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const colors = ["#7b4dff", "#ff5e7e", "#ffc83d", "#21c98b", "#3db8ff"];
  const parts = Array.from({ length: amount }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 14 - 4,
    s: 6 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
    c: colors[(Math.random() * colors.length) | 0],
  }));
  const end = performance.now() + 2800;
  (function frame(now) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); ctx.restore();
    }
    if (now < end) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })(performance.now());
}

// ===========================================================================
// Server API
// ===========================================================================
let account = { user: null, plan: null };

async function api(path, body, method = "POST") {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({ error: "Unexpected server response." }));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.code = data.code;
    if (data.code === "login") { account.user = null; openAuth("login"); }
    if (data.code === "subscribe") { if (account.user) account.user.subscribed = false; showView("paywall"); }
    throw err;
  }
  return data;
}
const tutor = (task, payload) => api("/api/tutor", { task, ...payload });

// ===========================================================================
// State (per signed-in user; per-language "courses")
// ===========================================================================
const freshCourse = () => ({ lessons: {}, deck: [], notes: "", levelEstimate: "", lastFeedback: null, session: { scenario: 0, history: [], xp: 0 } });
const defaultState = () => ({
  updatedAt: 0,
  profile: null, // { target, native, level, interests }
  courses: {},
  stats: { days: [], seconds: 0, words: 0, sessions: 0, xp: 0, xpByDay: {} },
  settings: { translate: false, slow: false, handsFree: false, sound: true, roman: true, goal: 50, voiceURI: "" },
});
let state = defaultState();
const storeKey = () => `sayso.v2:${account.user?.email || "guest"}`;
const course = () => {
  const c = (state.courses[state.profile.target] ??= freshCourse());
  c.lessons ??= {};
  return c;
};
const isPlus = () => !!account.user?.subscribed;

function hydrate(raw) {
  const d = defaultState();
  return raw ? { ...d, ...raw, stats: { ...d.stats, ...raw.stats }, settings: { ...d.settings, ...raw.settings }, courses: raw.courses || {} } : d;
}
function loadLocal() {
  try { return JSON.parse(localStorage.getItem(storeKey())); } catch { return null; }
}

let syncTimer;
function save() {
  state.updatedAt = Date.now();
  try { localStorage.setItem(storeKey(), JSON.stringify(state)); } catch {}
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushProgress, 2500);
}
function pushProgress(keepalive = false) {
  clearTimeout(syncTimer);
  if (!account.user) return;
  fetch("/api/progress", {
    method: "PUT", keepalive, credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ progress: state }),
  }).catch(() => {});
}
addEventListener("visibilitychange", () => document.visibilityState === "hidden" && account.user && pushProgress(true));

async function loadProgress() {
  const local = loadLocal();
  let remote = null;
  try { remote = (await api("/api/progress", null, "GET")).progress; } catch {}
  state = hydrate((remote?.updatedAt || 0) > (local?.updatedAt || 0) ? remote : local);
}

// ===========================================================================
// XP, goals, streaks, levels
// ===========================================================================
const levelOf = (xp) => { let n = 1; while (xp >= levelThreshold(n + 1)) n++; return n; };
const todayXp = () => state.stats.xpByDay[today()] || 0;

function streak() {
  const days = new Set(state.stats.days);
  const d = new Date();
  if (!days.has(today())) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function awardXp(amount, anchor) {
  const beforeGoal = todayXp();
  const beforeLevel = levelOf(state.stats.xp);
  state.stats.xp += amount;
  state.stats.xpByDay[today()] = beforeGoal + amount;
  if (!state.stats.days.includes(today())) state.stats.days.push(today());
  if (state.profile) course().session.xp = (course().session.xp || 0) + amount;
  save();
  if (anchor) {
    const r = anchor.getBoundingClientRect();
    const pop = el("div", { className: "xp-pop", textContent: `+${amount} XP` });
    pop.style.left = `${r.left + r.width / 2 - 30}px`;
    pop.style.top = `${r.top - 10}px`;
    document.body.append(pop);
    setTimeout(() => pop.remove(), 1200);
  }
  renderHud(true);
  const goal = state.settings.goal;
  if (beforeGoal < goal && beforeGoal + amount >= goal) {
    setTimeout(() => { play("fanfare"); confetti(); toast(`🎯 Daily goal reached! ${streak()} day streak 🔥`); }, 300);
  } else if (levelOf(state.stats.xp) > beforeLevel) {
    setTimeout(() => { play("fanfare"); confetti(90); toast(`⭐ Level up! You're now level ${levelOf(state.stats.xp)}`); }, 300);
  }
}

function renderHud(bump = false) {
  if (!state.profile) return;
  const [, , flag] = lang();
  $("#hud-lang").textContent = flag;
  $("#hud-lang").title = langName();
  $("#hud-streak").textContent = streak();
  $("#hud-xp").textContent = state.stats.xp.toLocaleString();
  const goal = state.settings.goal;
  $("#hud-goal").textContent = `${Math.min(todayXp(), goal)}/${goal}`;
  $("#goal-ring").style.strokeDashoffset = String(94.25 * (1 - Math.min(1, todayXp() / goal)));
  if (bump) for (const id of ["#hud-xp", "#hud-goal"]) { const n = $(id); n.classList.remove("bump"); void n.offsetWidth; n.classList.add("bump"); }
  updateDueBadge();
}

// ===========================================================================
// Speech output
// ===========================================================================
let voices = [];
function loadVoices() { voices = speechSynthesis.getVoices(); if (!$("#tab-me").hidden) renderVoiceSelect(); }
if ("speechSynthesis" in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function voicesForLang() {
  if (!state.profile) return [];
  const code = langCode().toLowerCase();
  const base = code.split("-")[0];
  const norm = (v) => v.lang.toLowerCase().replace("_", "-");
  const exact = voices.filter((v) => norm(v) === code);
  return [...exact, ...voices.filter((v) => norm(v).startsWith(base) && !exact.includes(v))];
}
function pickVoice() {
  const list = voicesForLang();
  return list.find((v) => v.voiceURI === state.settings.voiceURI) ||
    list.find((v) => /natural|neural|premium|enhanced|google/i.test(v.name)) || list[0] || null;
}
function speak(text, { slow = state.settings.slow } = {}) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window) || !text) return resolve();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langCode();
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = slow ? 0.72 : 0.95;
    u.onend = u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

// ===========================================================================
// Speech input
// ===========================================================================
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let activeRec = null;

function listen({ onInterim } = {}) {
  return new Promise((resolve, reject) => {
    if (!Recognition) return reject(new Error("Speech recognition needs Chrome, Edge or Safari. You can tap Type for now."));
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    const rec = new Recognition();
    rec.lang = langCode();
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    let started = 0;
    rec.onaudiostart = () => (started = performance.now());
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      onInterim?.((finalText + " " + interim).trim());
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed") reject(new Error("Microphone access is blocked. Allow it in your browser's site settings."));
      else if (e.error === "language-not-supported") reject(new Error(`Your browser can't recognise ${langName()} speech yet. Try Chrome.`));
      else reject(new Error(`Speech recognition error: ${e.error}`));
    };
    rec.onend = () => {
      activeRec = null;
      resolve({ text: finalText.trim(), seconds: started ? (performance.now() - started) / 1000 : 0 });
    };
    activeRec = rec;
    rec.start();
  });
}
const stopListening = () => activeRec?.stop();

function recordSpeech(text, seconds) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const dense = /[぀-ヿ㐀-鿿가-힯฀-๿]/.test(text);
  state.stats.words += dense ? Math.max(words, Math.round(text.replace(/\s/g, "").length / 2)) : words;
  state.stats.seconds += Math.min(seconds, 120);
  save();
}

// ===========================================================================
// Spaced repetition
// ===========================================================================
function addCard(prompt, answer, hint = "") {
  if (!prompt || !answer) return;
  const key = answer.trim().toLowerCase();
  const deck = course().deck;
  if (deck.some((c) => c.answer.trim().toLowerCase() === key)) return;
  deck.push({ id: crypto.randomUUID(), prompt, answer, hint, due: Date.now(), interval: 0, reps: 0 });
}
const dueCards = () => (state.profile ? course().deck.filter((c) => c.due <= Date.now()).sort((a, b) => a.due - b.due) : []);
function schedule(card, score) {
  const DAY = 864e5;
  if (score === 2) { card.interval = card.interval < 1 ? 1 : Math.round(card.interval * 2.5); card.reps++; card.due = Date.now() + card.interval * DAY; }
  else if (score === 1) { card.interval = Math.max(1, Math.round(card.interval * 1.2)); card.due = Date.now() + card.interval * DAY; }
  else { card.interval = 0; card.due = Date.now() + 10 * 60 * 1000; }
  save();
}
function updateDueBadge() {
  const n = dueCards().length;
  $("#due-count").hidden = n === 0;
  $("#due-count").textContent = n;
}

// ===========================================================================
// Landing & auth
// ===========================================================================
let authMode = "signup";
let pendingUpgrade = false;
function openAuth(mode, title) {
  authMode = mode;
  const signup = mode === "signup";
  $("#auth-title").textContent = title || (signup ? "Create your free account" : "Welcome back!");
  $("#auth-submit").textContent = signup ? "Create account" : "Log in";
  $("#auth-password").autocomplete = signup ? "new-password" : "current-password";
  $("#auth-password").placeholder = signup ? "Password (8+ characters)" : "Password";
  $("#auth-error").hidden = true;
  const sw = $("#auth-switch");
  sw.replaceChildren(signup ? "Already have an account? " : "New to Sayso? ",
    el("button", { className: "link", type: "button", textContent: signup ? "Log in" : "Sign up", onclick: () => openAuth(signup ? "login" : "signup") }));
  $("#auth-modal").hidden = false;
  paintMascots($("#auth-modal"));
  setTimeout(() => $("#auth-email").focus(), 50);
}

async function submitAuth(e) {
  e.preventDefault();
  const btn = $("#auth-submit");
  btn.disabled = true;
  $("#auth-error").hidden = true;
  try {
    const guest = state;
    account = await api("/api/account", { action: authMode, email: $("#auth-email").value, password: $("#auth-password").value });
    $("#auth-modal").hidden = true;
    $("#auth-form").reset();
    await loadProgress();
    if (!state.profile && guest.profile) { state = guest; save(); } // keep what they learned as a guest
    try { localStorage.removeItem("sayso.v2:guest"); } catch {}
    play("ding");
    if (pendingUpgrade && !isPlus()) { pendingUpgrade = false; return showView("paywall"); }
    route();
  } catch (err) {
    $("#auth-error").textContent = err.message;
    $("#auth-error").hidden = false;
    play("oops");
  } finally {
    btn.disabled = false;
  }
}

async function logout() {
  pushProgress(true);
  await api("/api/account", { action: "logout" }).catch(() => {});
  account.user = null;
  state = hydrate(loadLocal());
  lessonsData = null;
  route();
}

/** Any "Get Plus" button. */
function upgrade() {
  if (!account.plan?.plusAvailable && !isPlus()) return toast("Sayso Plus is coming soon! ✨ Keep learning free for now.");
  if (isPlus()) return state.profile ? (showApp(), switchTab("talk")) : route();
  if (!account.user) { pendingUpgrade = true; return openAuth("signup", "Create an account to get Plus"); }
  showView("paywall");
}

function renderPlan() {
  const p = account.plan;
  if (!p) return;
  const price = new Intl.NumberFormat(undefined, { style: "currency", currency: p.currency.toUpperCase() }).format(p.cents / 100);
  $$(".plan-price").forEach((n) => (n.textContent = price));
  $$(".plan-name").forEach((n) => (n.textContent = p.name));
  $$(".plan-trial").forEach((n) => { n.hidden = !p.trialDays; n.textContent = `🎁 ${p.trialDays}-day free trial`; });
  $$("[data-upgrade]").forEach((b) => {
    b.dataset.label ??= b.textContent;
    b.textContent = p.plusAvailable ? b.dataset.label : "Coming soon ✨";
    b.disabled = !p.plusAvailable;
  });
}

// ===========================================================================
// Routing
// ===========================================================================
function route() {
  renderPlan();
  if (state.profile) return showApp();
  if (account.user) return startOnboarding();
  showView("landing");
}

// ===========================================================================
// Onboarding
// ===========================================================================
let ob = { step: 0, target: null, level: null, goal: 50 };
const OB_QUESTIONS = [
  () => "What do you want to learn?",
  () => `How much ${ob.target} do you know?`,
  () => "Pick a daily goal!",
  () => "Almost there! Tell me about you.",
];

function startOnboarding(keepProfile = false) {
  ob = { step: 0, target: null, level: null, goal: state.settings.goal || 50 };
  const native = $("#native");
  if (!native.options.length) for (const [n] of LANGUAGES) native.append(el("option", { value: n, textContent: n }));
  const browser = (navigator.language || "en").toLowerCase();
  native.value = state.profile?.native ||
    (LANGUAGES.find(([, c]) => c.toLowerCase() === browser) || LANGUAGES.find(([, c]) => c.toLowerCase().startsWith(browser.split("-")[0])) || LANGUAGES[9])[0];
  $("#interests").value = state.profile?.interests || "";
  $("#ob-back").dataset.cancel = keepProfile ? "1" : "";
  renderLangGrid("");
  renderTiles("#level-grid", LEVELS.map(([e, v, sub]) => ({ e, label: sub, sub: v.replace(/ \(.*\)/, ""), value: v })), (v) => { ob.level = v; nextStep(); });
  renderTiles("#goal-grid", GOALS.map(([e, xp, label, sub]) => ({ e, label: `${label} · ${xp} XP`, sub, value: xp })), (v) => { ob.goal = v; nextStep(); });
  showStep(0);
  showView("onboarding");
}

function renderLangGrid(q) {
  const grid = $("#lang-grid");
  const query = q.trim().toLowerCase();
  const list = query
    ? LANGUAGES.filter(([n]) => n.toLowerCase().includes(query))
    : [...POPULAR.map((p) => LANGUAGES.find(([n]) => n === p)), ...LANGUAGES.filter(([n]) => !POPULAR.includes(n))];
  const tile = ([name, , flag]) => {
    const ready = langReady(name);
    const b = el("button", { className: `tile${ready ? "" : " soon"}`, type: "button", disabled: !ready },
      el("span", { className: "t-emoji", textContent: flag }), el("span", { textContent: name }),
      ready ? null : el("span", { className: "t-sub", textContent: "Coming soon" }));
    b.onclick = () => { play("pop"); ob.target = name; nextStep(); };
    return b;
  };
  const ready = list.filter(([n]) => langReady(n));
  const soon = list.filter(([n]) => !langReady(n));
  grid.replaceChildren(...ready.map(tile),
    ...(soon.length ? [el("p", { className: "grid-heading muted", textContent: "Coming soon" }), ...soon.map(tile)] : []));
}

function renderTiles(sel, items, onPick) {
  $(sel).replaceChildren(...items.map((it) => {
    const b = el("button", { className: "tile", type: "button" },
      el("span", { className: "t-emoji", textContent: it.e }),
      el("span", {}, it.label, el("span", { className: "t-sub", textContent: it.sub })));
    b.onclick = () => { play("pop"); onPick(it.value); };
    return b;
  }));
}

function showStep(n) {
  ob.step = n;
  $$(".ob-step").forEach((s) => (s.hidden = Number(s.dataset.step) !== n));
  $("#ob-question").textContent = OB_QUESTIONS[n]();
  $("#ob-progress").style.width = `${((n + 1) / 4) * 100}%`;
  const m = $("#onboarding .mascot-slot");
  m.classList.remove("wiggle"); void m.offsetWidth; m.classList.add("wiggle");
}
const nextStep = () => showStep(Math.min(3, ob.step + 1));

function finishOnboarding() {
  if (!ob.target || !ob.level) return showStep(0);
  if (ob.target === $("#native").value) return toast("Pick a language different from the one you already speak 🙂");
  state.profile = { target: ob.target, native: $("#native").value, level: ob.level, interests: $("#interests").value.trim() };
  state.settings.goal = ob.goal;
  lessonsData = null;
  currentTab = "learn";
  course();
  save();
  play("fanfare");
  confetti(80);
  showApp();
}

// ===========================================================================
// Talk tab
// ===========================================================================
let busy = false;

function renderScenarios() {
  const box = $("#scenarios");
  const current = course().session.scenario;
  box.replaceChildren(...SCENARIOS.map(([emoji, label, color], i) => {
    const b = el("button", { className: "chip", type: "button" }, el("span", { textContent: emoji }), label);
    b.style.setProperty("--c", `var(--${color})`);
    b.style.setProperty("--d", `var(--${color}-d)`);
    b.setAttribute("aria-pressed", String(i === current));
    b.onclick = () => {
      if (i === course().session.scenario || busy) return;
      play("pop");
      course().session = { scenario: i, history: [], xp: 0 };
      save();
      renderScenarios();
      renderChat();
      tutorTurn();
    };
    return b;
  }));
}

function renderChat() {
  const chat = $("#chat");
  chat.replaceChildren(...course().session.history.map(renderMessage));
  chat.scrollTop = chat.scrollHeight;
}

function tutorAvatar(mood = "talk") {
  const a = el("div", { className: "avatar mascot-slot" });
  a.dataset.mood = mood;
  a.innerHTML = mascot(mood);
  a.dataset.painted = mood;
  return a;
}

function renderMessage(m) {
  if (m.role === "you") return el("div", { className: "msg you" }, el("div", { className: "bubble", textContent: m.text }));
  const d = m.data || {};
  const body = el("div", { className: "body" }, el("div", { className: "bubble", textContent: m.text }));
  const translation = el("div", { className: "translation", textContent: d.reply_translation || "", hidden: !state.settings.translate });
  body.append(el("div", { className: "msg-tools" },
    el("button", { className: "btn-icon", title: "Listen again", textContent: "🔊", onclick: () => speak(m.text) }),
    el("button", { className: "btn-icon", title: "Listen slowly", textContent: "🐢", onclick: () => speak(m.text, { slow: true }) }),
    el("button", { className: "btn-icon", title: "Translate", textContent: "🌐", onclick: () => (translation.hidden = !translation.hidden) }),
    el("button", { className: "btn-icon", title: "Repeat after Sayso (+5 XP)", textContent: "🔁", onclick: (e) => shadow(m.text, body, e.currentTarget) }),
  ), translation);

  if (d.corrections?.length) {
    body.append(el("div", { className: "corrections" }, ...d.corrections.map((c) =>
      el("div", { className: "correction" },
        el("span", { className: "from", textContent: c.original }), " → ",
        el("span", { className: "to", textContent: c.corrected }), " ",
        el("button", { className: "btn-icon", textContent: "🔊", title: "Hear it", onclick: () => speak(c.corrected) }),
        el("span", { className: "why", textContent: c.explanation })))));
  } else if (d.corrections && m.afterLearner) {
    body.append(el("div", { className: "praise", textContent: ["✓ Perfect!", "✓ Sounded natural!", "✓ Nailed it!", "✓ Great job!"][m.text.length % 4] }));
  }
  if (d.vocabulary?.length) body.append(el("div", { className: "vocab" }, ...d.vocabulary.map((v) => el("span", { textContent: `${v.phrase} = ${v.meaning}` }))));
  if (d.suggestions?.length && m === course().session.history.at(-1)) {
    body.append(el("div", { className: "suggestions" },
      el("span", { className: "tiny muted", textContent: "💡 Try:" }),
      ...d.suggestions.map((s) => el("button", { type: "button", textContent: s, title: "Hear it, then say it yourself", onclick: () => speak(s) }))));
  }
  return el("div", { className: "msg tutor" }, tutorAvatar(d.corrections?.length ? "think" : "talk"), body);
}

function setMicState(mode) {
  const mic = $("#mic");
  mic.classList.toggle("listening", mode === "listening");
  mic.classList.toggle("busy", mode === "busy");
  $("#mic-hint").textContent = mode === "listening" ? "Listening… tap to stop" : mode === "busy" ? "Sayso is thinking…" : Recognition ? "Tap the mic and speak!" : "Voice needs Chrome, Edge or Safari. Tap Type for now.";
}

async function tutorTurn() {
  busy = true;
  setMicState("busy");
  const chat = $("#chat");
  const typing = el("div", { className: "msg tutor" }, tutorAvatar("happy"),
    el("div", { className: "bubble typing" }, el("span"), el("span"), el("span")));
  chat.append(typing);
  chat.scrollTop = chat.scrollHeight;
  const c = course();
  const lastWasLearner = c.session.history.at(-1)?.role === "you";
  try {
    const data = await tutor("chat", {
      profile: { ...state.profile, notes: c.notes },
      scenario: SCENARIOS[c.session.scenario][3],
      history: c.session.history.map(({ role, text }) => ({ role, text })),
    });
    c.session.history.push({ role: "tutor", text: data.reply, data, afterLearner: lastWasLearner });
    for (const x of data.corrections || []) addCard(`Fix it: “${x.original}”`, x.corrected, x.explanation);
    for (const v of data.vocabulary || []) addCard(v.meaning, v.phrase);
    save();
    renderChat();
    updateDueBadge();
    play(lastWasLearner && !data.corrections?.length ? "ding" : "pop");
    busy = false;
    setMicState("idle");
    await speak(data.reply);
    if (state.settings.handsFree && Recognition && !busy && !$("#tab-talk").hidden) learnerTurn();
  } catch (err) {
    typing.remove();
    busy = false;
    setMicState("idle");
    if (!["login", "subscribe"].includes(err.code)) toast(err.message);
  }
}

async function learnerTurn() {
  if (busy) return;
  if (activeRec) return stopListening();
  setMicState("listening");
  const interim = $("#interim");
  try {
    const { text, seconds } = await listen({ onInterim: (t) => (interim.textContent = t) });
    interim.textContent = "";
    setMicState("idle");
    if (!text) return toast("I didn't catch that. Tap the mic and try again!");
    recordSpeech(text, seconds);
    sendLearnerText(text);
  } catch (err) {
    interim.textContent = "";
    setMicState("idle");
    toast(err.message);
  }
}

function sendLearnerText(text) {
  course().session.history.push({ role: "you", text });
  if (text.split(/\s+/).length >= 2 || /[぀-鿿가-힯]/.test(text)) awardXp(XP.turn, $("#mic"));
  save();
  renderChat();
  tutorTurn();
}

async function shadow(text, container, anchor) {
  if (busy || activeRec) return;
  container.querySelector(".shadow-result")?.remove();
  await speak(text);
  const result = el("div", { className: "shadow-result muted", textContent: "🎙️ Your turn: repeat it!" });
  container.append(result);
  setMicState("listening");
  try {
    const { text: said, seconds } = await listen({ onInterim: (t) => (result.textContent = t) });
    setMicState("idle");
    if (!said) return (result.textContent = "Didn't catch that. Tap 🔁 to try again.");
    recordSpeech(said, seconds);
    const { pct, missed } = compare(text, said);
    result.className = `shadow-result ${pct >= 85 ? "score-2" : pct >= 60 ? "score-1" : "score-0"}`;
    result.textContent = `${pct >= 85 ? "🌟" : pct >= 60 ? "👍" : "💪"} ${pct}% match` + (missed.length ? ` · listen for: ${missed.slice(0, 6).join(", ")}` : " · perfect!");
    if (pct >= 85) { play("ding"); awardXp(XP.shadow, anchor); } else play("oops");
  } catch (err) {
    setMicState("idle");
    result.remove();
    toast(err.message);
  }
}

function tokens(s) {
  const clean = s.toLowerCase().normalize("NFC").replace(/[\p{P}\p{S}]/gu, " ").trim();
  return /[぀-ヿ㐀-鿿฀-๿]/.test(clean) ? [...clean.replace(/\s/g, "")] : clean.split(/\s+/).filter(Boolean);
}
function compare(expected, said) {
  const a = tokens(expected), b = tokens(said);
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const matched = new Set();
  for (let i = a.length, j = b.length; i > 0 && j > 0;) {
    if (a[i - 1] === b[j - 1]) { matched.add(i - 1); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return { pct: a.length ? Math.round((dp[a.length][b.length] / a.length) * 100) : 0, missed: [...new Set(a.filter((_, i) => !matched.has(i)))] };
}

async function finishSession() {
  const c = course();
  if (busy) return;
  if (c.session.history.filter((m) => m.role === "you").length < 2) return toast("Say a few things first, then finish to get your feedback! 🎙️");
  busy = true;
  $("#end-session").disabled = true;
  toast("Sayso is reviewing your session… ✨");
  try {
    const s = await tutor("summary", { profile: { ...state.profile, notes: c.notes }, history: c.session.history.map(({ role, text }) => ({ role, text })) });
    c.notes = s.notes;
    c.levelEstimate = s.level_estimate;
    c.lastFeedback = { date: today(), feedback: s.feedback, focus: s.focus_areas, scenario: SCENARIOS[c.session.scenario][1] };
    state.stats.sessions++;
    awardXp(XP.finish);
    const earned = c.session.xp || XP.finish;
    c.session = { scenario: c.session.scenario, history: [], xp: 0 };
    save();
    renderChat();
    $("#toast").hidden = true;
    $("#cel-title").textContent = ["Session complete!", "Amazing work!", "You crushed it!", "Look at you go!"][state.stats.sessions % 4];
    $("#cel-xp").textContent = `+${earned}`;
    $("#cel-streak").textContent = `${streak()}🔥`;
    $("#cel-level").textContent = s.level_estimate;
    $("#cel-feedback").textContent = s.feedback;
    $("#cel-focus").replaceChildren(...(s.focus_areas || []).map((f) => el("li", { textContent: f })));
    $("#celebrate").hidden = false;
    paintMascots($("#celebrate"));
    play("fanfare");
    confetti();
  } catch (err) {
    if (!["login", "subscribe"].includes(err.code)) toast(err.message);
  } finally {
    busy = false;
    $("#end-session").disabled = false;
  }
}

// ===========================================================================
// Review tab
// ===========================================================================
let currentCard = null;

function renderReview() {
  const due = dueCards();
  const deck = course().deck;
  $("#review-empty").hidden = deck.length > 0;
  $("#review-done").hidden = !(deck.length && !due.length);
  $("#review-card").hidden = !due.length;
  $("#review-result").hidden = true;
  $$(".target-name").forEach((n) => (n.textContent = langName()));
  updateDueBadge();
  paintMascots($("#tab-review"));
  if (!due.length) return;
  currentCard = due[0];
  $("#review-left").textContent = `${due.length} to go`;
  $("#review-prompt").textContent = currentCard.prompt;
  $("#review-hint").textContent = currentCard.hint ? `💡 ${currentCard.hint}` : "";
  $("#review-said").textContent = "";
  $("#review-skip").hidden = false;
  $("#review-mic").disabled = false;
  const flash = $(".flash");
  flash.style.animation = "none"; void flash.offsetWidth; flash.style.animation = "";
}

async function reviewAnswer() {
  if (!currentCard || busy) return;
  if (activeRec) return stopListening();
  const mic = $("#review-mic");
  const said = $("#review-said");
  mic.classList.add("listening");
  try {
    const { text, seconds } = await listen({ onInterim: (t) => (said.textContent = t) });
    mic.classList.remove("listening");
    if (!text) return (said.textContent = "Didn't catch that. Tap the mic and try again.");
    recordSpeech(text, seconds);
    said.textContent = `You said: “${text}”`;
    mic.disabled = true;
    busy = true;
    if (isPlus()) {
      const g = await tutor("grade", { profile: state.profile, prompt: currentCard.prompt, expected: currentCard.answer, said: text });
      showReviewResult(Math.max(0, Math.min(2, g.score)), g.feedback, g.model_answer || currentCard.answer);
    } else {
      const { pct } = compare(currentCard.answer, text);
      const score = pct >= 80 ? 2 : pct >= 55 ? 1 : 0;
      showReviewResult(score, ["Listen and try it again.", `${pct}% there. Listen closely to the answer.`, `${pct}% match!`][score], currentCard.answer);
    }
  } catch (err) {
    mic.classList.remove("listening");
    mic.disabled = false;
    if (!["login", "subscribe"].includes(err.code)) toast(err.message);
  } finally {
    busy = false;
  }
}

function showReviewResult(score, feedback, answer) {
  schedule(currentCard, score);
  const banner = $("#review-result");
  banner.className = `result-banner ${["bad", "ok", "good"][score]}`;
  $("#review-feedback").textContent = `${["💪 Not quite!", "👍 Almost!", "🎉 Excellent!"][score]} ${feedback}`;
  $("#review-answer").textContent = answer;
  banner.hidden = false;
  $("#review-skip").hidden = true;
  $("#review-mic").disabled = true;
  if (score === 2) { play("ding"); awardXp(XP.review, $("#review-mic")); }
  else if (score === 1) { play("pop"); awardXp(XP.reviewOk, $("#review-mic")); }
  else play("oops");
  speak(answer);
  banner.scrollIntoView({ behavior: "smooth", block: "end" });
}

// ===========================================================================
// Me tab
// ===========================================================================
function renderMe() {
  const xp = state.stats.xp;
  const lvl = levelOf(xp);
  const lo = levelThreshold(lvl), hi = levelThreshold(lvl + 1);
  $("#me-level").textContent = `Level ${lvl} · ${lang()[2]} ${langName()}`;
  $("#lvl-fill").style.width = `${((xp - lo) / (hi - lo)) * 100}%`;
  $("#lvl-text").textContent = `${hi - xp} XP to level ${lvl + 1}`;
  $("#stat-streak").textContent = streak();
  $("#stat-xp").textContent = xp.toLocaleString();
  $("#stat-minutes").textContent = Math.round(state.stats.seconds / 60);
  $("#stat-cefr").textContent = course().levelEstimate || "–";

  const days = new Set(state.stats.days);
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    week.push(el("div", { className: `day${days.has(k) ? " hit" : ""}${i === 0 ? " today" : ""}` },
      el("div", { className: "dot", textContent: days.has(k) ? "🔥" : "" }),
      d.toLocaleDateString(undefined, { weekday: "narrow" })));
  }
  $("#week").replaceChildren(...week);

  const fb = course().lastFeedback;
  const fbBox = $("#last-feedback");
  if (fb) {
    fbBox.classList.remove("muted");
    fbBox.replaceChildren(el("strong", { textContent: `${fb.scenario} · ${fb.date}` }), "\n", fb.feedback,
      fb.focus?.length ? el("ul", {}, ...fb.focus.map((f) => el("li", { textContent: f }))) : null);
  } else {
    fbBox.classList.add("muted");
    fbBox.textContent = "Finish a conversation to get feedback from Sayso.";
  }
  const notes = $("#tutor-notes");
  notes.textContent = course().notes || "Nothing yet. Start talking!";
  notes.classList.toggle("muted", !course().notes);

  $("#opt-sound").checked = state.settings.sound;
  $("#opt-handsfree").checked = state.settings.handsFree;
  $("#opt-translate").checked = state.settings.translate;
  $("#opt-slow").checked = state.settings.slow;
  $("#opt-goal").replaceChildren(...GOALS.map(([e, xp2, label]) => el("option", { value: xp2, textContent: `${e} ${label} (${xp2} XP)`, selected: xp2 === state.settings.goal })));
  const u = account.user;
  $("#me-email").textContent = u ? `Signed in as ${u.email} · ${isPlus() ? "Sayso Plus ✨" : "Free plan"}` : "Learning as a guest. Your progress is saved on this device only.";
  $("#me-upgrade").hidden = isPlus() || !account.plan?.plusAvailable;
  $("#manage-sub").hidden = !u?.subscribed;
  $("#me-signup").hidden = !!u;
  $("#me-login").hidden = !!u;
  $("#me-logout").hidden = !u;
  $("#delete-account").hidden = !u;
  $("#opt-roman").checked = state.settings.roman;
  renderVoiceSelect();
  paintMascots($("#tab-me"));
}

function renderVoiceSelect() {
  const sel = $("#voice-select");
  if (!state.profile) return;
  const list = voicesForLang();
  const current = pickVoice();
  sel.replaceChildren(...(list.length
    ? list.map((v) => el("option", { value: v.voiceURI, textContent: `${v.name} (${v.lang})`, selected: v === current }))
    : [el("option", { value: "", textContent: `No ${langName()} voice installed (add one in your device settings)` })]));
}

// ===========================================================================
// Learn tab: free lesson path (no AI per learner; content is generated once per language)
// ===========================================================================
let lessonsData = null;
let lessonsLang = null;
let lessonsLoading = null;
const LESSON_KINDS = [["⭐", "Words"], ["💬", "Phrases"], ["🎙️", "Speak it"]];
const noSpaces = () => /^(Japanese|Chinese|Cantonese|Thai)/.test(langName());

async function loadLessons() {
  const name = langName();
  if (lessonsData && lessonsLang === name) return lessonsData;
  const key = `sayso.lessons.v1:${name}`;
  try {
    const cached = JSON.parse(localStorage.getItem(key));
    if (cached?.length) { lessonsLang = name; return (lessonsData = cached); }
  } catch {}
  // Hand-written lessons ship as static files: free and instant.
  try {
    const res = await fetch(`/lessons/${slugOf(name)}.json`);
    if (res.ok) {
      const data = await res.json();
      try { localStorage.setItem(key, JSON.stringify(data.units)); } catch {}
      lessonsLang = name;
      return (lessonsData = data.units);
    }
  } catch {}
  if (!account.plan?.generateLessons) throw new Error(`${name} lessons are coming soon! Pick another language in Me → Change language.`);
  for (let i = 0; i < 80; i++) {
    const res = await fetch(`/api/lessons?lang=${encodeURIComponent(name)}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.units) {
      try { localStorage.setItem(key, JSON.stringify(data.units)); } catch {}
      lessonsLang = name;
      return (lessonsData = data.units);
    }
    if (res.status !== 202) throw new Error(data.error || "Couldn't load lessons.");
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error("Your lessons are taking a while. Try again in a minute.");
}

const lessonKey = (ui, li) => `${ui}-${li}`;
const slugOf = (name) => name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
let readyLanguages = null; // languages with hand-written lessons (from /lessons/index.json)
async function loadReadyLanguages() {
  try { readyLanguages = new Set(await (await fetch("/lessons/index.json")).json()); } catch { readyLanguages = null; }
}
const langReady = (name) => !readyLanguages || readyLanguages.has(name) || !!account.plan?.generateLessons;
const isDone = (ui, li) => !!course().lessons[lessonKey(ui, li)]?.done;

function renderPath() {
  const path = $("#path");
  if (!lessonsData || lessonsLang !== langName()) {
    path.replaceChildren(el("div", { className: "path-loading" },
      (() => { const m = el("div", { className: "mascot-slot bob path-mascot" }); m.dataset.mood = "think"; return m; })(),
      el("h3", { textContent: `Preparing your ${langName()} lessons…` }),
      el("p", { className: "muted", textContent: "The first time takes up to a minute. After that it's instant!" })));
    paintMascots(path);
    lessonsLoading ??= loadLessons()
      .then(() => { if (currentTab === "learn" && !$("#app").hidden) renderPath(); })
      .catch((err) => {
        path.replaceChildren(el("div", { className: "path-loading" }, el("h3", { textContent: "Oops, lessons didn't load" }),
          el("p", { className: "muted", textContent: err.message }),
          el("button", { className: "btn btn-primary", textContent: "Try again", onclick: () => renderPath() })));
      })
      .finally(() => (lessonsLoading = null));
    return;
  }
  // The first not-done lesson is "current"; everything after it is locked.
  let foundCurrent = false;
  const parts = [];
  lessonsData.forEach((unit, ui) => {
    const unitLocked = foundCurrent;
    const head = el("div", { className: `unit-head${unitLocked ? " locked" : ""}` },
      el("span", { className: "u-emoji", textContent: unit.emoji }),
      el("div", {}, el("div", { className: "u-kicker", textContent: `Unit ${ui + 1}` }), el("h3", { textContent: unit.title })));
    head.style.setProperty("--c", `var(--${unit.color})`);
    head.style.setProperty("--d", `var(--${unit.color}-d)`);
    const nodes = el("div", { className: "nodes" });
    LESSON_KINDS.forEach(([icon, label], li) => {
      const done = isDone(ui, li);
      const current = !done && !foundCurrent;
      const locked = !done && !current;
      if (current) foundCurrent = true;
      const btn = el("button", { className: `node${done ? " done" : ""}${current ? " current" : ""}${locked ? " locked" : ""}`, textContent: locked ? "🔒" : done ? "✓" : icon, title: `${unit.title}: ${label}` });
      btn.style.setProperty("--c", `var(--${unit.color})`);
      btn.style.setProperty("--d", `var(--${unit.color}-d)`);
      btn.onclick = () => (locked ? (play("oops"), toast("Finish the lesson before this one to unlock it 🔒")) : startLesson(ui, li));
      const wrap = el("div", { className: "node-wrap" }, current ? el("span", { className: "start-tip", textContent: "Start" }) : null, btn, el("span", { className: "node-label", textContent: label }));
      wrap.style.transform = `translateX(${[0, 46, -46][li] * (ui % 2 ? -1 : 1)}px)`;
      if (current) wrap.querySelector(".start-tip").style.setProperty("--c", `var(--${unit.color}-d)`);
      nodes.append(wrap);
    });
    parts.push(head, nodes);
  });
  if (!foundCurrent) parts.push(el("div", { className: "path-loading" }, el("h3", { textContent: "🏆 You finished every lesson!" }),
    el("p", { className: "muted", textContent: isPlus() ? "Head to Talk and put it all to use in real conversations." : "Replay any lesson, or unlock real conversations with Sayso Plus." }),
    isPlus() ? null : el("button", { className: "btn btn-primary", textContent: "See Sayso Plus", onclick: upgrade })));
  path.replaceChildren(...parts);
  path.querySelector(".node.current")?.scrollIntoView({ block: "center" });
}

// --- building a lesson -------------------------------------------------------
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pick = (a, n) => shuffle(a).slice(0, n);

function buildLesson(ui, li) {
  const U = lessonsData[ui];
  const earlier = lessonsData.slice(0, ui + 1);
  const wordPool = earlier.flatMap((u) => u.words);
  const phrasePool = earlier.flatMap((u) => u.phrases);
  const W = U.words, P = U.phrases;
  const ex = (type, item, pool) => ({ type, item, pool });
  let list;
  if (li === 0) {
    const w = shuffle(W);
    list = [ex("pickTarget", w[0], wordPool), ex("pickTarget", w[1], wordPool), { type: "match", items: w.slice(0, 4) },
      ex("listenPick", w[2], wordPool), ex("pickTarget", w[3], wordPool), ex("speak", w[4]), ex("pickTarget", w[5], wordPool),
      ex("listenPick", w[6], wordPool), { type: "match", items: w.slice(4, 8) }, ex("speak", w[7])];
  } else if (li === 1) {
    const p = shuffle(P);
    list = [ex("pickTarget", p[0], phrasePool), ex("build", p[1]), ex("listenPick", p[2], phrasePool), ex("build", p[3]),
      ex("speak", p[4]), ex("reverse", p[5], phrasePool), ex("build", p[6]), ex("listenPick", p[7], phrasePool), ex("speak", p[0]), ex("pickTarget", p[3], phrasePool)];
  } else {
    const p = shuffle(P);
    list = [ex("speak", p[0]), ex("buildListen", p[1]), ex("speak", p[2]), ex("reverse", p[3], phrasePool), ex("buildListen", p[4]),
      ex("speak", p[5]), { type: "match", items: pick(W, 4) }, ex("buildListen", p[6]), ex("speak", p[7]), ex("reverse", p[1], phrasePool)];
  }
  if (!Recognition) list = list.map((e) => (e.type === "speak" ? { ...e, type: "listenPick", pool: e.item.tokens ? phrasePool : wordPool } : e));
  return list;
}

// --- running a lesson ----------------------------------------------------------
let L = null; // current lesson run

function startLesson(ui, li) {
  play("pop");
  L = { ui, li, queue: buildLesson(ui, li), total: 10, done: 0, firstTryRight: 0, retried: new Set(), combo: 0, bestCombo: 0, noSpeak: false, cur: null };
  L.total = L.queue.length;
  showView("lesson");
  nextExercise();
}

function setFooter(mode, html = "") {
  const f = $("#ex-footer");
  f.className = `ex-footer${mode === "good" ? " good" : mode === "bad" ? " bad" : ""}`;
  $("#ex-feedback").innerHTML = html;
  const btn = $("#ex-check");
  btn.textContent = mode === "check" ? "Check" : "Continue";
  btn.dataset.mode = mode === "check" ? "check" : "next";
  btn.disabled = mode === "check";
}
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const targetWithRoman = (item) => {
  const box = el("span", { textContent: item.target });
  if (state.settings.roman && item.roman) box.append(el("span", { className: "roman", textContent: item.roman }));
  return box;
};

function nextExercise() {
  while (L.queue.length && L.noSpeak && L.queue[0].type === "speak") { L.queue.shift(); L.done++; }
  $("#lesson-progress").style.width = `${(L.done / L.total) * 100}%`;
  if (!L.queue.length) return finishLesson();
  L.cur = L.queue.shift();
  L.cur.attempts = 0;
  $("#ex-skip").hidden = L.cur.type !== "speak";
  setFooter("check");
  const box = $("#ex");
  box.replaceChildren();
  box.style.animation = "none"; void box.offsetWidth; box.style.animation = "";
  ({ pickTarget: exPick, reverse: exReverse, listenPick: exListen, build: exBuild, buildListen: exBuild, speak: exSpeak, match: exMatch })[L.cur.type](box, L.cur);
  paintMascots(box);
}

function distractors(item, pool, field, n = 3) {
  const seen = new Set([item[field]]);
  const out = [];
  for (const x of shuffle(pool)) { if (!seen.has(x[field])) { seen.add(x[field]); out.push(x); } if (out.length === n) break; }
  return out;
}

function optionList(box, choices, labelFn, correct, grid = false) {
  const opts = el("div", { className: `options${grid ? " grid2" : ""}` });
  let chosen = null;
  for (const c of shuffle(choices)) {
    const b = el("button", { className: "opt", type: "button" }, labelFn(c));
    b.onclick = () => {
      opts.querySelectorAll(".opt").forEach((o) => o.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      chosen = c;
      $("#ex-check").disabled = false;
      play("pop");
    };
    b._choice = c;
    opts.append(b);
  }
  box.append(opts);
  L.cur.evaluate = () => {
    opts.querySelectorAll(".opt").forEach((o) => { if (o._choice === correct) o.classList.add("right"); else if (o._choice === chosen) o.classList.add("wrong"); });
    return chosen === correct;
  };
}

function prompt(box, title, speechNode, mood = "talk") {
  box.append(el("h2", { className: "ex-title", textContent: title }));
  if (speechNode) {
    const m = el("div", { className: "mascot-slot" }); m.dataset.mood = mood;
    box.append(el("div", { className: "ex-prompt" }, m, el("div", { className: "speech" }, speechNode)));
  }
}

function exPick(box, ex) {
  prompt(box, `How do you say this in ${langName()}?`, document.createTextNode(`“${ex.item.en}”`));
  optionList(box, [ex.item, ...distractors(ex.item, ex.pool, "target")], (c) => targetWithRoman(c), ex.item, !ex.item.tokens);
  ex.solution = ex.item.target;
}

function exReverse(box, ex) {
  const s = el("span", {}, el("button", { className: "speak-btn", type: "button", textContent: "🔊", onclick: () => speak(ex.item.target) }), " ", targetWithRoman(ex.item));
  prompt(box, "What does this mean?", s);
  optionList(box, [ex.item, ...distractors(ex.item, ex.pool, "en")], (c) => document.createTextNode(c.en), ex.item);
  ex.solution = ex.item.en;
  setTimeout(() => speak(ex.item.target), 300);
}

function exListen(box, ex) {
  box.append(el("h2", { className: "ex-title", textContent: "What did you hear?" }));
  box.append(el("div", { className: "listen-row" },
    el("button", { className: "speak-btn big", type: "button", textContent: "🔊", onclick: () => speak(ex.item.target) }),
    el("button", { className: "speak-btn slow", type: "button", textContent: "🐢", onclick: () => speak(ex.item.target, { slow: true }) })));
  optionList(box, [ex.item, ...distractors(ex.item, ex.pool, "en")], (c) => document.createTextNode(c.en), ex.item);
  ex.solution = `${ex.item.target} = ${ex.item.en}`;
  setTimeout(() => speak(ex.item.target), 300);
}

function exBuild(box, ex) {
  const listenOnly = ex.type === "buildListen";
  if (listenOnly) {
    box.append(el("h2", { className: "ex-title", textContent: "Tap what you hear" }));
    box.append(el("div", { className: "listen-row" },
      el("button", { className: "speak-btn big", type: "button", textContent: "🔊", onclick: () => speak(ex.item.target) }),
      el("button", { className: "speak-btn slow", type: "button", textContent: "🐢", onclick: () => speak(ex.item.target, { slow: true }) })));
    setTimeout(() => speak(ex.item.target), 300);
  } else {
    prompt(box, `Write this in ${langName()}`, document.createTextNode(`“${ex.item.en}”`));
  }
  const line = el("div", { className: "answer-line" });
  const bank = el("div", { className: "bank" });
  const picked = [];
  const tiles = shuffle([...ex.item.tokens.map((t, i) => ({ t, i })), ...(ex.item.distractors || []).map((t, i) => ({ t, i: `d${i}` }))]);
  for (const tile of tiles) {
    const src = el("button", { className: "chip-tile", type: "button", textContent: tile.t });
    src.onclick = () => {
      play("pop");
      src.classList.add("used");
      const placed = el("button", { className: "chip-tile", type: "button", textContent: tile.t });
      placed.onclick = () => { placed.remove(); src.classList.remove("used"); picked.splice(picked.indexOf(tile), 1); $("#ex-check").disabled = !picked.length; };
      picked.push(tile);
      line.append(placed);
      $("#ex-check").disabled = false;
    };
    bank.append(src);
  }
  box.append(line, bank);
  const norm = (s) => s.toLowerCase().replace(/[\p{P}\s]/gu, "");
  L.cur.evaluate = () => norm(picked.map((p) => p.t).join("")) === norm(ex.item.tokens.join(""));
  ex.solution = `${ex.item.target}${listenOnly ? ` = ${ex.item.en}` : ""}`;
}

function exSpeak(box, ex) {
  box.append(el("h2", { className: "ex-title", textContent: "Say this out loud" }));
  box.append(el("div", { className: "speak-target" },
    el("button", { className: "speak-btn", type: "button", textContent: "🔊", onclick: () => speak(ex.item.target) }), targetWithRoman(ex.item),
    el("div", { className: "tiny muted", textContent: ex.item.en })));
  const mic = el("button", { className: "mic speak-mic", type: "button", "aria-label": "Speak" });
  mic.innerHTML = $("#mic").innerHTML;
  const heard = el("p", { className: "heard", textContent: "Tap the mic and say it!" });
  box.append(mic, heard);
  mic.onclick = async () => {
    if (activeRec) return stopListening();
    mic.classList.add("listening");
    try {
      const { text, seconds } = await listen({ onInterim: (t) => (heard.textContent = t) });
      mic.classList.remove("listening");
      if (!text) return (heard.textContent = "Didn't catch that. Tap the mic and try again!");
      recordSpeech(text, seconds);
      const { pct, missed } = compare(ex.item.target, text);
      ex.attempts++;
      heard.textContent = `“${text}” · ${pct}% match`;
      if (pct >= 70) {
        mic.disabled = true;
        judge(true);
      } else if (ex.attempts >= 3) {
        mic.disabled = true;
        judge(false, missed);
      } else {
        play("oops");
        heard.textContent += missed.length ? ` · listen for: ${missed.slice(0, 4).join(", ")}` : "";
        speak(ex.item.target, { slow: true });
      }
    } catch (err) {
      mic.classList.remove("listening");
      toast(err.message);
    }
  };
  ex.solution = ex.item.target;
}

function exMatch(box, ex) {
  box.append(el("h2", { className: "ex-title", textContent: "Tap the matching pairs" }));
  const grid = el("div", { className: "match-grid" });
  const left = shuffle(ex.items), right = shuffle(ex.items);
  let sel = null, matched = 0, mistakes = 0;
  const colL = el("div", { className: "options" }), colR = el("div", { className: "options" });
  const make = (item, side) => {
    const b = el("button", { className: "opt", type: "button" }, side === "t" ? targetWithRoman(item) : document.createTextNode(item.en));
    b.onclick = () => {
      if (side === "t") speak(item.target);
      if (!sel || sel.side === side) {
        (sel?.btn)?.setAttribute("aria-pressed", "false");
        sel = { item, side, btn: b };
        b.setAttribute("aria-pressed", "true");
        return;
      }
      if (sel.item === item) {
        play("ding");
        for (const x of [sel.btn, b]) { x.setAttribute("aria-pressed", "false"); x.classList.add("right"); setTimeout(() => x.classList.add("matched"), 250); }
        matched++;
        if (matched === ex.items.length) { L.cur.matchMistakes = mistakes; judge(mistakes === 0, null, true); }
      } else {
        play("oops");
        mistakes++;
        for (const x of [sel.btn, b]) { x.classList.add("wrong"); setTimeout(() => x.classList.remove("wrong"), 400); }
        sel.btn.setAttribute("aria-pressed", "false");
      }
      sel = null;
    };
    return b;
  };
  left.forEach((it) => colL.append(make(it, "t")));
  right.forEach((it) => colR.append(make(it, "e")));
  grid.append(colL, colR);
  box.append(grid);
}

function onCheck() {
  if ($("#ex-check").dataset.mode === "next") { L.done++; return nextExercise(); }
  judge(L.cur.evaluate());
}

function judge(correct, missed = null, isMatch = false) {
  const ex = L.cur;
  $("#ex-skip").hidden = true;
  const firstTry = !L.retried.has(ex);
  if (correct) {
    if (firstTry) L.firstTryRight++;
    L.combo++;
    L.bestCombo = Math.max(L.bestCombo, L.combo);
    play("ding");
    const praise = ["Nice!", "Awesome!", "You got it!", "Great job!", "Perfect!", "Amazing!"][(Math.random() * 6) | 0];
    setFooter("good", `🎉 ${praise}${ex.type === "speak" || ex.type.startsWith("build") ? `<span class="sol">${esc(ex.solution)}</span>` : ""}`);
  } else {
    L.combo = 0;
    play("oops");
    if (!isMatch && !L.retried.has(ex)) { L.retried.add(ex); L.queue.push(ex); L.total++; } // try it again at the end
    if (ex.item) addCard(ex.item.en, ex.item.target, ex.item.roman || "");
    save();
    setFooter("bad", isMatch ? "💪 All matched! Keep practicing those." : `Correct answer:<span class="sol">${esc(ex.solution)}</span>`);
    if (ex.item && ex.type !== "match") speak(ex.item.target);
  }
  const combo = $("#lesson-combo");
  combo.hidden = L.combo < 3;
  combo.textContent = `🔥 ${L.combo} in a row!`;
  $("#ex-check").disabled = false;
}

function skipSpeaking() {
  L.noSpeak = true;
  toast("No problem! Speaking exercises are off for this lesson.");
  L.done++;
  nextExercise();
}

function finishLesson() {
  const key = lessonKey(L.ui, L.li);
  const first = !course().lessons[key]?.done;
  const original = Math.max(1, L.total - L.retried.size); // exercises before any retries were added
  const accuracy = Math.max(0, Math.min(100, Math.round((L.firstTryRight / original) * 100)));
  const xp = 10 + (L.retried.size === 0 ? 5 : 0) + (first ? 0 : -5);
  course().lessons[key] = { done: true, best: Math.max(accuracy, course().lessons[key]?.best || 0), at: Date.now() };
  showView("lesson-done");
  awardXp(Math.max(5, xp));
  $("#done-title").textContent = L.retried.size === 0 ? "Perfect lesson! 🌟" : ["Lesson complete!", "Well done!", "Keep it up!"][L.li];
  $("#done-xp").textContent = `+${Math.max(5, xp)}`;
  $("#done-acc").textContent = `${accuracy}%`;
  $("#done-streak").textContent = `${streak()}🔥`;
  $("#done-upsell").hidden = isPlus() || L.li !== 2 || !account.plan?.plusAvailable;
  paintMascots($("#lesson-done"));
  play("fanfare");
  confetti(L.retried.size === 0 ? 160 : 90);
  save();
}

// ===========================================================================
// App shell
// ===========================================================================
let currentTab = "learn";
function switchTab(name) {
  if (activeRec) stopListening();
  currentTab = name;
  $$(".tabbar button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
  for (const t of ["learn", "talk", "review", "me"]) $(`#tab-${t}`).hidden = t !== name;
  $("#plus-badge").hidden = isPlus();
  if (name === "learn") renderPath();
  if (name === "talk") renderTalk();
  if (name === "review") renderReview();
  if (name === "me") renderMe();
}

function renderTalk() {
  const plus = isPlus();
  $("#talk-locked").hidden = plus;
  $("#talk-locked-title").textContent = account.plan?.plusAvailable ? "Ready for real conversations?" : "Real conversations are coming soon!";
  for (const id of ["#scenarios", "#chat", ".composer"]) $(`#tab-talk ${id}`).hidden = !plus;
  paintMascots($("#tab-talk"));
  if (!plus) return;
  renderScenarios();
  renderChat();
  if (course().session.history.length === 0 && !busy) tutorTurn();
}

function showApp() {
  showView("app");
  $("#type-input").placeholder = `Type in ${langName()}…`;
  renderHud();
  if (!Recognition) $("#type-form").hidden = false;
  setMicState("idle");
  switchTab(currentTab || "learn");
}

function wire() {
  $$("[data-open-auth]").forEach((b) => (b.onclick = () => openAuth(b.dataset.openAuth)));
  $$("[data-start-free]").forEach((b) => (b.onclick = () => (state.profile ? showApp() : startOnboarding())));
  $$("[data-upgrade]").forEach((b) => (b.onclick = upgrade));
  $$("[data-tab-go]").forEach((b) => (b.onclick = () => switchTab(b.dataset.tabGo)));
  $("#paywall-later").onclick = () => (state.profile ? showApp() : showView("landing"));
  $("#lesson-close").onclick = () => { if (confirm("Quit this lesson? You'll lose its progress.")) { speechSynthesis?.cancel(); showApp(); } };
  $("#ex-check").onclick = onCheck;
  $("#ex-skip").onclick = skipSpeaking;
  $("#done-continue").onclick = () => { showApp(); switchTab("learn"); };
  $$("[data-close]").forEach((b) => (b.onclick = () => (b.closest(".modal").hidden = true)));
  $$(".modal").forEach((m) => m.addEventListener("click", (e) => e.target === m && (m.hidden = true)));
  $$("[data-logout]").forEach((b) => (b.onclick = logout));
  $("#auth-form").onsubmit = submitAuth;
  $("#year").textContent = new Date().getFullYear();

  $("#subscribe").onclick = async (e) => {
    e.currentTarget.disabled = true;
    try { location.href = (await api("/api/billing", { action: "checkout" })).url; }
    catch (err) { toast(err.message); e.currentTarget.disabled = false; }
  };
  $("#manage-sub").onclick = async () => {
    try { location.href = (await api("/api/billing", { action: "portal" })).url; } catch (err) { toast(err.message); }
  };
  $("#delete-account").onclick = async () => {
    if (!confirm("Delete your Sayso account and all progress? This can't be undone.")) return;
    try {
      await api("/api/account", { action: "delete" });
      try { localStorage.removeItem(storeKey()); } catch {}
      account.user = null;
      state = defaultState();
      route();
      toast("Your account was deleted. Come back anytime! 👋");
    } catch (err) { toast(err.message); }
  };

  $("#lang-search").oninput = (e) => renderLangGrid(e.target.value);
  $("#ob-back").onclick = () => {
    if (ob.step > 0) return showStep(ob.step - 1);
    if ($("#ob-back").dataset.cancel && state.profile) showApp();
  };
  $("#ob-finish").onclick = finishOnboarding;

  $$(".tabbar button").forEach((b) => (b.onclick = () => { play("pop"); switchTab(b.dataset.tab); }));
  $("#mic").onclick = learnerTurn;
  $("#end-session").onclick = finishSession;
  $("#toggle-type").onclick = () => { $("#type-form").hidden = !$("#type-form").hidden; if (!$("#type-form").hidden) $("#type-input").focus(); };
  $("#type-form").onsubmit = (e) => {
    e.preventDefault();
    const text = $("#type-input").value.trim();
    if (!text || busy) return;
    $("#type-input").value = "";
    sendLearnerText(text);
  };

  $("#review-mic").onclick = reviewAnswer;
  $("#review-skip").onclick = () => currentCard && showReviewResult(0, "Here's how to say it. Repeat it out loud a few times!", currentCard.answer);
  $("#review-next").onclick = renderReview;
  $("#review-listen").onclick = () => speak($("#review-answer").textContent);

  const setting = (id, key, after) => ($(id).onchange = (e) => { state.settings[key] = e.target.checked; save(); after?.(); });
  setting("#opt-sound", "sound");
  setting("#opt-handsfree", "handsFree");
  setting("#opt-translate", "translate", renderChat);
  setting("#opt-slow", "slow");
  setting("#opt-roman", "roman");
  $("#opt-goal").onchange = (e) => { state.settings.goal = Number(e.target.value); save(); renderHud(); };
  $("#voice-select").onchange = (e) => { state.settings.voiceURI = e.target.value; save(); speak("1, 2, 3"); };
  $("#change-lang").onclick = () => { lessonsData = null; startOnboarding(true); };

  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.repeat || $("#app").hidden || $("#tab-talk").hidden || !isPlus()) return;
    if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(document.activeElement?.tagName)) return;
    e.preventDefault();
    learnerTurn();
  });
}

// ===========================================================================
// Boot
// ===========================================================================
async function boot() {
  paintMascots();
  wire();
  try {
    account = await api("/api/account", { action: "me" });
  } catch {
    account = { user: null, plan: null };
  }
  const params = new URLSearchParams(location.search);
  if (params.get("checkout")) {
    history.replaceState(null, "", location.pathname);
    if (params.get("checkout") === "success" && account.user) {
      try {
        account.user.subscribed = (await api("/api/billing", { action: "confirm", sessionId: params.get("session_id") })).subscribed;
        if (account.user.subscribed) { currentTab = "talk"; setTimeout(() => { play("fanfare"); confetti(); toast("🎉 Welcome to Sayso Plus! Say hi to your tutor."); }, 400); }
      } catch (err) { toast(err.message); }
    }
  }
  await loadReadyLanguages();
  if (account.user) await loadProgress();
  else state = hydrate(loadLocal());
  route();
}
boot();
