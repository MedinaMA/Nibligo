// POST /api/tutor  { task: "chat" | "grade" | "summary", ...payload }  (subscribers only)
import { route, json, readBody, HttpError } from "../lib/http.js";
import { requireUser, limit } from "../lib/auth.js";
import { refreshSubscription, PLAN } from "../lib/billing.js";
import { tasks } from "../lib/tutor.js";

export const POST = route(async (request) => {
  const body = await readBody(request);
  const handler = tasks[body.task];
  if (!handler) throw new HttpError(400, "Unknown task.");
  const user = await requireUser(request);
  if (!(await refreshSubscription(user))) throw new HttpError(402, "Subscribe to Sayso Plus to talk with your tutor.", "subscribe");
  const day = new Date().toISOString().slice(0, 10);
  await limit(`use:${user.email}:${day}`, PLAN.dailyLimit, 2 * 86400,
    "You've hit today's practice limit. Amazing effort! Your tutor will be ready again tomorrow.");
  return json(await handler(body));
});
