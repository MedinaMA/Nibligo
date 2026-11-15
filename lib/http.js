// Request/response helpers shared by every /api function (Web-standard Request/Response).
import Anthropic from "@anthropic-ai/sdk";
import Stripe from "stripe";

export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

export async function readBody(request) {
  const raw = await request.text();
  if (raw.length > 400_000) throw new HttpError(413, "Request too large.");
  try {
    return JSON.parse(raw || "{}");
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}

/** Wrap a handler so every thrown error becomes a friendly JSON response. */
export function route(handler) {
  return async (request) => {
    try {
      return await handler(request);
    } catch (err) {
      return errorToResponse(err);
    }
  };
}

function errorToResponse(err) {
  if (err instanceof HttpError) return json({ error: err.message, code: err.code }, err.status);
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("Anthropic auth failed: check ANTHROPIC_API_KEY");
    return json({ error: "The tutor is temporarily unavailable. Please try again later." }, 503);
  }
  if (err instanceof Anthropic.RateLimitError) return json({ error: "Lots of people are talking right now. Try again in a moment." }, 429);
  if (err instanceof Anthropic.APIConnectionError) return json({ error: "Couldn't reach the tutor. Try again." }, 503);
  if (err instanceof Anthropic.APIError) {
    console.error("Claude API error", err.status, err.message);
    return json({ error: "The tutor hiccuped. Please try again." }, 502);
  }
  if (err instanceof Stripe.errors.StripeError) {
    console.error("Stripe error", err.type, err.message);
    return json({ error: "Payment service error. Please try again." }, 502);
  }
  if (err instanceof SyntaxError) return json({ error: "The tutor gave an unreadable reply. Please try again." }, 502);
  console.error(err);
  return json({ error: "Something went wrong. Please try again." }, 500);
}

export function siteUrl(request) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  return new URL(request.url).origin;
}
