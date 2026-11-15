// POST /api/billing  { action: "checkout" | "portal" | "confirm", sessionId? }
import { route, json, readBody, HttpError, siteUrl } from "../lib/http.js";
import { requireUser } from "../lib/auth.js";
import { createCheckout, createPortal, confirmCheckout } from "../lib/billing.js";

export const POST = route(async (request) => {
  const body = await readBody(request);
  const user = await requireUser(request);
  const base = siteUrl(request);
  switch (body.action) {
    case "checkout":
      return json({ url: await createCheckout(user, base) });
    case "portal":
      return json({ url: await createPortal(user, base) });
    case "confirm":
      return json({ subscribed: await confirmCheckout(user, body.sessionId) });
    default:
      throw new HttpError(400, "Unknown action.");
  }
});
