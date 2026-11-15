// Email + password accounts with signed, HttpOnly session cookies.
import { scrypt, randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { promisify } from "node:util";
import { db } from "./store.js";
import { HttpError } from "./http.js";

const scryptAsync = promisify(scrypt);
const COOKIE = "sayso_session";
const SESSION_DAYS = 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.VERCEL) throw new Error("SESSION_SECRET is not set.");
  return "local-dev-only-secret";
}

export const normalizeEmail = (e) => String(e || "").trim().toLowerCase();

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password, stored) {
  const [, saltB64, hashB64] = String(stored).split("$");
  if (!saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

const sign = (payload) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function sessionCookie(email) {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const payload = Buffer.from(JSON.stringify({ e: email, x: exp })).toString("base64url");
  const value = `${payload}.${sign(payload)}`;
  const secure = process.env.VERCEL ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function readSession(request) {
  const cookies = Object.fromEntries(
    (request.headers.get("cookie") || "").split(/;\s*/).filter(Boolean).map((c) => {
      const i = c.indexOf("=");
      return [c.slice(0, i), c.slice(i + 1)];
    }),
  );
  const raw = cookies[COOKIE];
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const good = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (good.length !== given.length || !timingSafeEqual(good, given)) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return x > Date.now() ? e : null;
  } catch {
    return null;
  }
}

export const userKey = (email) => `user:${email}`;

/** The signed-in user record, or null. */
export async function currentUser(request) {
  const email = readSession(request);
  if (!email) return null;
  const user = await db().get(userKey(email));
  return user ? { ...user, email } : null;
}

export async function requireUser(request) {
  const user = await currentUser(request);
  if (!user) throw new HttpError(401, "Please log in.", "login");
  return user;
}

export async function saveUser(user) {
  const { email, ...rest } = user;
  await db().set(userKey(email), rest);
}

/** Simple fixed-window limiter, e.g. to slow down password guessing. */
export async function limit(key, max, windowSeconds, message) {
  const n = await db().incr(`rl:${key}`, windowSeconds);
  if (n > max) throw new HttpError(429, message || "Too many attempts. Try again later.");
}
