// GET/PUT /api/progress: sync a learner's progress across devices.
import { route, json, readBody, HttpError } from "../lib/http.js";
import { requireUser } from "../lib/auth.js";
import { db } from "../lib/store.js";

export const GET = route(async (request) => {
  const user = await requireUser(request);
  return json({ progress: (await db().get(`progress:${user.email}`)) || null });
});

export const PUT = route(async (request) => {
  const user = await requireUser(request);
  const { progress } = await readBody(request);
  if (!progress || typeof progress !== "object") throw new HttpError(400, "Missing progress.");
  if (JSON.stringify(progress).length > 300_000) throw new HttpError(413, "Progress too large.");
  await db().set(`progress:${user.email}`, progress);
  return json({ ok: true });
});
